<?php

namespace App\Controller;

use App\Entity\Book;
use App\Entity\Publisher;
use App\Entity\Writer;
use App\Entity\Translator;
use App\Entity\Category;
use App\Enums\UserTypeEnum;
use App\Utilities\Permission;
use App\Utilities\OrmActionHandler;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\String\Slugger\AsciiSlugger;
// use PhpOffice\PhpSpreadsheet\IOFactory;

class BookImportController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private AsciiSlugger $slugger;

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;
        $this->slugger = new AsciiSlugger();
    }

    /**
     * Stage 1: Upload and validate CSV file
     * Returns preview of books with conflict detection
     */
    public function uploadCsv(Request $request): JsonResponse
    {
        $bearer = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [UserTypeEnum::Mod, UserTypeEnum::Admin]);

        if ($permission->error === true) {
            $message = 'Bir hata oluştu, hata kodu #BookImport-upload-1';
            if (in_array($permission->errorCode, [1, 2, 3, 4])) {
                $message = $permission->errorMessage;
            }
            return new JsonResponse(['status' => false, 'message' => $message, 'response' => null], 401);
        }

        $csvFile = $request->files->get('csv_file');
        
        if (!$csvFile) {
            return new JsonResponse(['status' => false, 'message' => 'CSV dosyası gönderilmedi', 'response' => null], 400);
        }

        try {
            $csvContent = file_get_contents($csvFile->getPathname());
            
            // Handle UTF-8 BOM if present
            $csvContent = str_replace("\xEF\xBB\xBF", '', $csvContent);
            
            // Split by lines and parse CSV
            $lines = explode("\n", $csvContent);
            $rows = [];
            
            foreach ($lines as $line) {
                if (trim($line) !== '') {
                    $rows[] = str_getcsv($line);
                }
            }
            
            // Remove empty rows
            $rows = array_filter($rows, function($row) {
                return !empty(array_filter($row, function($cell) {
                    return trim($cell) !== '';
                }));
            });

            // Skip header row
            array_shift($rows);

            $booksPreview = [];
            $errors = [];

            foreach ($rows as $index => $row) {
                $lineNumber = $index + 2; // +2 because we skipped header and arrays are 0-indexed
                
                // Parse row data
                $bookData = $this->parseCsvRow($row, $lineNumber);
                
                if ($bookData['hasError']) {
                    $errors[] = $bookData['error'];
                    continue;
                }

                // Check for conflicts
                $conflictInfo = $this->checkBookConflicts($bookData);
                $bookData['conflict'] = $conflictInfo;
                
                $booksPreview[] = $bookData;
            }

            return new JsonResponse([
                'status' => true,
                'message' => 'CSV dosyası başarıyla analiz edildi',
                'response' => [
                    'books' => $booksPreview,
                    'errors' => $errors,
                    'totalBooks' => count($booksPreview),
                    'conflictCount' => count(array_filter($booksPreview, fn($book) => $book['conflict']['hasConflict']))
                ]
            ], 200);

        } catch (\Exception $e) {
            return new JsonResponse(['status' => false, 'message' => 'CSV dosyası okuma hatası: ' . $e->getMessage(), 'response' => null], 400);
        }
    }

    /**
     * Stage 2: Process the confirmed books import
     */
    public function processImport(Request $request): JsonResponse
    {
        $bearer = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [UserTypeEnum::Mod, UserTypeEnum::Admin]);

        if ($permission->error === true) {
            $message = 'Bir hata oluştu, hata kodu #BookImport-process-1';
            if (in_array($permission->errorCode, [1, 2, 3, 4])) {
                $message = $permission->errorMessage;
            }
            return new JsonResponse(['status' => false, 'message' => $message, 'response' => null], 401);
        }

        $payload = json_decode($request->getContent(), true);
        $booksToImport = $payload['books'] ?? [];
        $conflictDecisions = $payload['decisions'] ?? [];

        if (empty($booksToImport)) {
            return new JsonResponse(['status' => false, 'message' => 'İçe aktarılacak kitap bulunamadı', 'response' => null], 400);
        }

        $imported = [];
        $skipped = [];
        $errors = [];

        foreach ($booksToImport as $index => $bookData) {
            try {
                $result = $this->importSingleBook($bookData, $conflictDecisions[$index] ?? null);
                
                if ($result['success']) {
                    $imported[] = $result['book'];
                } else {
                    if ($result['skipped']) {
                        $skipped[] = $result['message'];
                    } else {
                        $errors[] = $result['message'];
                    }
                }
            } catch (\Exception $e) {
                $errors[] = "Satır {$bookData['lineNumber']}: " . $e->getMessage();
            }
        }

        return new JsonResponse([
            'status' => true,
            'message' => 'Kitap içe aktarma işlemi tamamlandı',
            'response' => [
                'imported' => count($imported),
                'skipped' => count($skipped),
                'errors' => count($errors),
                'importedBooks' => $imported,
                'skippedReasons' => $skipped,
                'errorMessages' => $errors
            ]
        ], 200);
    }

    /**
     * Parse a single CSV row into book data
     */
    private function parseCsvRow(array $row, int $lineNumber): array
    {
        // Expected columns: orgName, name, writers, translators, publisher, pageNumber, isbn, lang, format, date, content, categories, image, country

        $requiredFields = ['orgName', 'name', 'writers', 'publisher', 'pageNumber', 'lang'];
        $bookData = [
            'lineNumber' => $lineNumber,
            'orgName' => trim($row[0] ?? ''),
            'name' => trim($row[1] ?? ''),
            'writers' => trim($row[2] ?? ''),
            'translators' => trim($row[3] ?? ''),
            'publisher' => trim($row[4] ?? ''),
            'pageNumber' => trim($row[5] ?? ''),
            'isbn' => trim($row[6] ?? ''),
            'lang' => trim($row[7] ?? ''),
            'format' => trim($row[8] ?? ''),
            'date' => trim($row[9] ?? ''),
            'content' => trim($row[10] ?? ''),
            'categories' => trim($row[11] ?? ''),
            'image' => trim($row[12] ?? ''),
            'country' => trim($row[13] ?? ''),
            'hasError' => false,
            'error' => null
        ];

        // Validate required fields
        foreach ($requiredFields as $field) {
            if (empty($bookData[$field])) {
                $bookData['hasError'] = true;
                $bookData['error'] = "Satır {$lineNumber}: {$field} alanı boş olamaz";
                return $bookData;
            }
        }

        // Validate page number
        if (!is_numeric($bookData['pageNumber']) || $bookData['pageNumber'] <= 0) {
            $bookData['hasError'] = true;
            $bookData['error'] = "Satır {$lineNumber}: Sayfa sayısı geçerli bir sayı olmalıdır";
            return $bookData;
        }

        return $bookData;
    }

    /**
     * Check for book conflicts (existing books, editions, etc.)
     */
    private function checkBookConflicts(array $bookData): array
    {
        $conflictInfo = [
            'hasConflict' => false,
            'type' => null,
            'message' => '',
            'existingBook' => null,
            'isEdition' => false
        ];

        // Writers/publisher/translators/categories that don't exist yet are auto-created at
        // import time (see createBookFromData), so they never block a row here - only used to
        // detect whether this row matches an already-registered original book.
        $writerNames = array_map('trim', explode(',', $bookData['writers']));
        $writerIds = [];

        foreach ($writerNames as $writerName) {
            $writer = $this->entityManager->getRepository(Writer::class)->findOneBy(['name' => $writerName]);
            if ($writer) {
                $writerIds[] = $writer->getId();
            }
        }

        // Check if original book exists (same orgName and writers)
        $originalBook = $this->entityManager->getRepository(Book::class)->findOneBy([
            'orgName' => $bookData['orgName'],
            'originalBook' => null
        ]);

        if ($originalBook && count($writerIds) === count($writerNames)) {
            // Check if writers match
            $originalWriterIds = [];
            foreach ($originalBook->getWriters() as $writer) {
                $originalWriterIds[] = $writer->getId();
            }

            sort($originalWriterIds);
            sort($writerIds);

            if ($originalWriterIds === $writerIds) {
                // Same original book found
                $conflictInfo['hasConflict'] = true;
                $conflictInfo['existingBook'] = $originalBook;

                $publisher = $this->entityManager->getRepository(Publisher::class)->findOneBy(['name' => $bookData['publisher']]);

                $existingEdition = $publisher ? $this->entityManager->getRepository(Book::class)->findOneBy([
                    'originalBook' => $originalBook,
                    'publisher' => $publisher,
                    'lang' => $bookData['lang']
                ]) : null;

                if ($existingEdition) {
                    // Check if translators also match
                    $translatorNames = !empty($bookData['translators']) ? array_map('trim', explode(',', $bookData['translators'])) : [];
                    $existingTranslatorNames = [];
                    foreach ($existingEdition->getTranslators() as $translator) {
                        $existingTranslatorNames[] = $translator->getName();
                    }

                    sort($translatorNames);
                    sort($existingTranslatorNames);

                    if ($translatorNames === $existingTranslatorNames) {
                        $conflictInfo['type'] = 'exact_duplicate';
                        $conflictInfo['message'] = 'Bu kitabın tam olarak aynısı zaten sistemde mevcut';
                    } else {
                        $conflictInfo['type'] = 'different_edition';
                        $conflictInfo['message'] = 'Bu kitabın aynı yayınevinden farklı çevirmenli versiyonu mevcut';
                        $conflictInfo['isEdition'] = true;
                    }
                } else {
                    $conflictInfo['type'] = 'new_edition';
                    $conflictInfo['message'] = 'Bu kitabın farklı baskısı/çevirisi olarak eklenebilir';
                    $conflictInfo['isEdition'] = true;
                }
            }
        }

        return $conflictInfo;
    }

    /**
     * Import a single book based on conflict decision
     */
    private function importSingleBook(array $bookData, ?string $decision): array
    {
        $conflict = $bookData['conflict'];

        // Handle conflict decisions
        if ($conflict['hasConflict']) {
            switch ($conflict['type']) {
                case 'exact_duplicate':
                    if ($decision !== 'force_import') {
                        return ['success' => false, 'skipped' => true, 'message' => "Satır {$bookData['lineNumber']}: Duplicate - atlandı"];
                    }
                    break;

                case 'new_edition':
                case 'different_edition':
                    if ($decision !== 'add_edition') {
                        return ['success' => false, 'skipped' => true, 'message' => "Satır {$bookData['lineNumber']}: Edition conflict - atlandı"];
                    }
                    break;
            }
        }

        // Create the book
        return $this->createBookFromData($bookData);
    }

    /**
     * Create book entity from parsed data
     */
    private function findOrCreateWriter(string $name): Writer
    {
        $writer = $this->entityManager->getRepository(Writer::class)->findOneBy(['name' => $name]);
        if ($writer) {
            return $writer;
        }

        $writer = new Writer();
        $writer->setName($name);
        $writer->setSlug($this->slugger->slug($name)->lower());
        $writer->setViewCount(0);
        $writer->setScore(0);
        $this->entityManager->persist($writer);

        return $writer;
    }

    private function findOrCreateTranslator(string $name): Translator
    {
        $translator = $this->entityManager->getRepository(Translator::class)->findOneBy(['name' => $name]);
        if ($translator) {
            return $translator;
        }

        $translator = new Translator();
        $translator->setName($name);
        $translator->setSlug($this->slugger->slug($name)->lower());
        $translator->setViewCount(0);
        $translator->setScore(0);
        $this->entityManager->persist($translator);

        return $translator;
    }

    private function findOrCreatePublisher(string $name): Publisher
    {
        $publisher = $this->entityManager->getRepository(Publisher::class)->findOneBy(['name' => $name]);
        if ($publisher) {
            return $publisher;
        }

        $publisher = new Publisher();
        $publisher->setName($name);
        $publisher->setSlug($this->slugger->slug($name)->lower());
        $this->entityManager->persist($publisher);

        return $publisher;
    }

    private function findOrCreateCategory(string $name): Category
    {
        $category = $this->entityManager->getRepository(Category::class)->findOneBy(['category' => $name]);
        if ($category) {
            return $category;
        }

        $category = new Category();
        $category->setCategory($name);
        $category->setSlug($this->slugger->slug($name)->lower());
        $this->entityManager->persist($category);

        return $category;
    }

    private function createBookFromData(array $bookData): array
    {
        $publisher = $this->findOrCreatePublisher($bookData['publisher']);

        $writers = [];
        $writerNames = array_filter(array_map('trim', explode(',', $bookData['writers'])));
        foreach ($writerNames as $writerName) {
            $writers[] = $this->findOrCreateWriter($writerName);
        }

        $translators = [];
        if (!empty($bookData['translators'])) {
            $translatorNames = array_filter(array_map('trim', explode(',', $bookData['translators'])));
            foreach ($translatorNames as $translatorName) {
                $translators[] = $this->findOrCreateTranslator($translatorName);
            }
        }

        // Check for original book
        $originalBook = $bookData['conflict']['existingBook'] ?? null;

        $categories = [];
        if ($originalBook) {
            // Editions inherit the original book's categories
            $categories = $originalBook->getCategories()->toArray();
        } elseif (!empty($bookData['categories'])) {
            $categoryNames = array_filter(array_map('trim', explode(',', $bookData['categories'])));
            foreach ($categoryNames as $categoryName) {
                $categories[] = $this->findOrCreateCategory($categoryName);
            }
        }

        // Create new book
        $book = new Book();
        $book->setOrgName($bookData['orgName']);
        $book->setName($bookData['name']);
        $book->setPublisher($publisher);
        $book->setPageNumber((int)$bookData['pageNumber']);
        $book->setLang($bookData['lang']);
        $book->setOriginalBook($originalBook);

        if (!empty($bookData['isbn'])) {
            $book->setIsbn($bookData['isbn']);
        }

        if (!empty($bookData['format'])) {
            $book->setFormat($bookData['format']);
        }

        if (!empty($bookData['content'])) {
            $book->setContent($bookData['content']);
        }

        if (!empty($bookData['image'])) {
            $book->setImage($bookData['image']);
        }

        if (!empty($bookData['country'])) {
            $book->setCountry($bookData['country']);
        }

        if (!empty($bookData['date'])) {
            try {
                $date = \DateTime::createFromFormat('Y-m-d', $bookData['date']);
                if ($date) {
                    $book->setDate($date);
                }
            } catch (\Exception $e) {
                // Ignore invalid date
            }
        }

        $book->setSlug($this->slugger->slug($publisher->getName() . '/' . $book->getName())->lower());
        $book->setScore(0);
        $book->setViewCount(0);
        $book->setApprove(true); // Auto-approve imported books

        // Add relationships
        foreach ($writers as $writer) {
            $book->addWriter($writer);
        }
        foreach ($translators as $translator) {
            $book->addTranslator($translator);
        }
        foreach ($categories as $category) {
            $book->addCategory($category);
        }

        // Save to database
        $ormActionHandler = new OrmActionHandler($this->entityManager, $book);

        if ($ormActionHandler->status && is_null($ormActionHandler->error)) {
            return [
                'success' => true,
                'book' => [
                    'id' => $book->getId(),
                    'name' => $book->getName(),
                    'orgName' => $book->getOrgName(),
                    'publisher' => $publisher->getName(),
                    'isOriginal' => is_null($originalBook)
                ]
            ];
        } else {
            return ['success' => false, 'skipped' => false, 'message' => "Satır {$bookData['lineNumber']}: Veritabanı hatası - " . $ormActionHandler->errorMessage];
        }
    }

    /**
     * Get CSV template download
     */
    public function downloadTemplate(): JsonResponse
    {
        $templateData = [
            'headers' => [
                'Orijinal Kitap Adı',
                'Kitap Adı',
                'Yazarlar (virgülle ayırın)',
                'Çevirmenler (virgülle ayırın)',
                'Yayınevi',
                'Sayfa Sayısı',
                'ISBN',
                'Dil',
                'Format',
                'Tarih (YYYY-MM-DD)',
                'İçerik',
                'Kategoriler (virgülle ayırın)',
                'Görsel (URL)',
                'Ülke'
            ],
            'example' => [
                'The Great Gatsby',
                'Muhteşem Gatsby',
                'F. Scott Fitzgerald',
                'Çevirmen Adı',
                'İletişim Yayınları',
                '180',
                '9786050123456',
                'tr',
                'Ciltli',
                '2023-01-15',
                'Klasik Amerikan edebiyatının başyapıtı...',
                'Roman,Klasik',
                'https://example.com/kapak.jpg',
                'ABD'
            ],
            'csv_content' => null
        ];

        // Generate CSV content
        $csvData = [$templateData['headers'], $templateData['example']];
        $csvContent = '';
        foreach ($csvData as $row) {
            $csvContent .= implode(',', array_map(function($field) {
                return '"' . str_replace('"', '""', $field) . '"';
            }, $row)) . "\n";
        }
        
        $templateData['csv_content'] = $csvContent;

        return new JsonResponse([
            'status' => true,
            'message' => 'Şablon bilgileri getirildi',
            'response' => $templateData
        ], 200);
    }
}