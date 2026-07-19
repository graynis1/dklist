<?php

namespace App\Utilities;

use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\Exception\IniSizeFileException;

class ImageManager extends AbstractController
{
    private string $cloudinaryCloudName;
    private string $cloudinaryApiKey;
    private string $cloudinaryApiSecret;
    private string $cloudinaryFolder;

    public function __construct(
        string $cloudinaryCloudName = '',
        string $cloudinaryApiKey = '',
        string $cloudinaryApiSecret = '',
        string $cloudinaryFolder = 'dklist'
    ) {
        $this->cloudinaryCloudName = $cloudinaryCloudName;
        $this->cloudinaryApiKey = $cloudinaryApiKey;
        $this->cloudinaryApiSecret = $cloudinaryApiSecret;
        $this->cloudinaryFolder = $cloudinaryFolder;
    }

    private function cloudinaryConfigured(): bool
    {
        return $this->cloudinaryCloudName !== '' && $this->cloudinaryApiKey !== '' && $this->cloudinaryApiSecret !== '';
    }

    public function saveImage( $file ){
        try{
            $allowedExtensions = ['png', 'jpg', 'jfif', 'jpeg', 'webp'];
            $extension = $file->getClientOriginalExtension();
            if (!in_array($extension, $allowedExtensions)) {
                throw new \Exception('Sadece .png ve .jpg uzantılı resim dosyaları kabul edilir.');
            }

            if ($this->cloudinaryConfigured()) {
                return $this->uploadToCloudinary($file);
            }

            // Yerel diske yazma - kalıcı disk olmayan ortamlarda (ör. Render free tier)
            // yeniden başlatmada kaybolur; CLOUDINARY_* env değişkenleri tanımlanmalı.
            $uploadDirectory = $this->getParameter('kernel.project_dir') . '/uploads';
            $originalFileName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME );
            $newFileName = $originalFileName . '_' . uniqid() . '.' . $extension;
            $file->move( $uploadDirectory, $newFileName );
            return $newFileName;
        }
        catch ( IniSizeFileException $sizeExc ){
            return [ 'error' => true, 'errorMessage' => $sizeExc->getMessage() ];
        }
        catch( Exception $error ){
            return [ 'error' => true, 'errorMessage' => $error->getMessage() ];
        }

    }

    private function uploadToCloudinary($file)
    {
        $timestamp = time();
        $paramsToSign = [
            'folder' => $this->cloudinaryFolder,
            'timestamp' => $timestamp,
        ];
        ksort($paramsToSign);
        $toSign = '';
        foreach ($paramsToSign as $key => $value) {
            $toSign .= ($toSign === '' ? '' : '&') . $key . '=' . $value;
        }
        $signature = sha1($toSign . $this->cloudinaryApiSecret);

        $curlFile = new \CURLFile($file->getPathname(), $file->getMimeType() ?: 'application/octet-stream', $file->getClientOriginalName());

        $postFields = [
            'file' => $curlFile,
            'api_key' => $this->cloudinaryApiKey,
            'timestamp' => $timestamp,
            'folder' => $this->cloudinaryFolder,
            'signature' => $signature,
        ];

        $ch = curl_init("https://api.cloudinary.com/v1_1/{$this->cloudinaryCloudName}/image/upload");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new \Exception('Resim yükleme servisine ulaşılamadı: ' . $curlError);
        }

        $decoded = json_decode($response, true);

        if ($httpCode >= 300 || !isset($decoded['secure_url'])) {
            $message = $decoded['error']['message'] ?? 'Bilinmeyen hata';
            throw new \Exception('Resim yüklenemedi: ' . $message);
        }

        return $decoded['secure_url'];
    }

    public function getImagePath($imageName){
        $imagePath = $this->getParameter('kernel.project_dir') . '/uploads/' . $imageName;
        if (file_exists($imagePath)) {
            return $imagePath;
        }
        throw new \Exception('Resim Bulunamadı', );
    }

    public function generateImageURL($imageName){
        if ( !$imageName ) {
            return null;
        }
        // Cloudinary (veya başka) tarafından döndürülen tam URL zaten kullanılabilir durumda.
        if (str_starts_with($imageName, 'http://') || str_starts_with($imageName, 'https://')) {
            return $imageName;
        }
        // Eski (yerel diskte saklanan) kayıtlar için geriye dönük uyumluluk.
        $url = $_SERVER['HTTP_HOST']."/image/$imageName";
        if (!str_contains($url, 'http')) {
            $url = 'http://'.$url;
        }
        return $url;
    }

    public function deleteImage($imageName)
    {
        try {
            if (str_starts_with($imageName, 'http://') || str_starts_with($imageName, 'https://')) {
                if ($this->cloudinaryConfigured()) {
                    $this->deleteFromCloudinary($imageName);
                }
                return ['status' => true, 'message' => 'Resim başarıyla silindi.'];
            }

            $imagePath = $this->getImagePath($imageName);
            unlink($imagePath); // Resmi sil
            return ['status' => true, 'message' => 'Resim başarıyla silindi.'];
        } catch (\Exception $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    private function deleteFromCloudinary(string $imageUrl): void
    {
        // https://res.cloudinary.com/<cloud>/image/upload/v.../folder/public_id.ext
        $path = parse_url($imageUrl, PHP_URL_PATH);
        if (!$path) {
            return;
        }
        $parts = explode('/upload/', $path);
        if (count($parts) < 2) {
            return;
        }
        $afterUpload = preg_replace('#^v\d+/#', '', ltrim($parts[1], '/'));
        $publicId = preg_replace('#\.[a-zA-Z0-9]+$#', '', $afterUpload);

        $timestamp = time();
        $paramsToSign = ['public_id' => $publicId, 'timestamp' => $timestamp];
        ksort($paramsToSign);
        $toSign = '';
        foreach ($paramsToSign as $key => $value) {
            $toSign .= ($toSign === '' ? '' : '&') . $key . '=' . $value;
        }
        $signature = sha1($toSign . $this->cloudinaryApiSecret);

        $ch = curl_init("https://api.cloudinary.com/v1_1/{$this->cloudinaryCloudName}/image/destroy");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, [
            'public_id' => $publicId,
            'api_key' => $this->cloudinaryApiKey,
            'timestamp' => $timestamp,
            'signature' => $signature,
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_exec($ch);
        curl_close($ch);
    }

}
