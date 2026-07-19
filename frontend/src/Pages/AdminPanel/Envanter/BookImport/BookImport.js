import React, { useState } from 'react';
import { Upload, Button, Table, Tag, Modal, Alert, Steps, Space, Typography, Card, Divider } from 'antd';
import { UploadOutlined, DownloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import './BookImport.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://dklist.com/api';
const APP_BASE_URL = process.env.REACT_APP_BASE_URL || 'https://dklist.com';

const { Step } = Steps;
const { Title, Text } = Typography;
const { confirm } = Modal;

const BookImport = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [booksPreview, setBooksPreview] = useState([]);
    const [errors, setErrors] = useState([]);
    const [conflictDecisions, setConflictDecisions] = useState({});
    const [importResults, setImportResults] = useState(null);

    // Download CSV template
    const downloadTemplate = () => {
        try {
            const link = document.createElement('a');
            link.setAttribute('href', `${APP_BASE_URL}/kitap_import_sablonu.csv`);
            link.setAttribute('download', 'kitap_import_sablonu.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            Modal.error({
                title: 'Hata',
                content: 'Şablon indirilemedi: ' + error.message
            });
        }
    };

    // Upload CSV file for analysis
    const uploadCsv = async (file) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('csv_file', file);

        try {
            const response = await axios.post(`${API_BASE_URL}/book/import/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.status) {
                setBooksPreview(response.data.response.books);
                setErrors(response.data.response.errors);
                setCurrentStep(1);
                
                Modal.success({
                    title: 'Başarılı',
                    content: `${response.data.response.totalBooks} kitap analiz edildi. ${response.data.response.conflictCount} çakışma tespit edildi.`
                });
            } else {
                Modal.error({
                    title: 'Hata',
                    content: response.data.message
                });
            }
        } catch (error) {
            Modal.error({
                title: 'Hata',
                content: 'Dosya yüklenemedi: ' + (error.response?.data?.message || error.message)
            });
        } finally {
            setUploading(false);
        }

        return false; // Prevent default upload
    };

    // Handle conflict decisions
    const handleConflictDecision = (bookIndex, decision) => {
        setConflictDecisions({
            ...conflictDecisions,
            [bookIndex]: decision
        });
    };

    // Process import
    const processImport = async () => {
        setProcessing(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/book/import/process`, {
                books: booksPreview,
                decisions: conflictDecisions
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status) {
                setImportResults(response.data.response);
                setCurrentStep(2);
                
                Modal.success({
                    title: 'İçe Aktarma Tamamlandı',
                    content: `${response.data.response.imported} kitap başarıyla eklendi. ${response.data.response.skipped} kitap atlandı. ${response.data.response.errors} hata oluştu.`
                });
            } else {
                Modal.error({
                    title: 'Hata',
                    content: response.data.message
                });
            }
        } catch (error) {
            Modal.error({
                title: 'Hata',
                content: 'İşlem tamamlanamadı: ' + (error.response?.data?.message || error.message)
            });
        } finally {
            setProcessing(false);
        }
    };

    // Reset to start
    const resetImport = () => {
        setCurrentStep(0);
        setBooksPreview([]);
        setErrors([]);
        setConflictDecisions({});
        setImportResults(null);
    };

    // Table columns for preview
    const previewColumns = [
        {
            title: 'Satır',
            dataIndex: 'lineNumber',
            width: 60,
        },
        {
            title: 'Orijinal Adı',
            dataIndex: 'orgName',
            width: 150,
        },
        {
            title: 'Kitap Adı',
            dataIndex: 'name',
            width: 150,
        },
        {
            title: 'Yazarlar',
            dataIndex: 'writers',
            width: 120,
        },
        {
            title: 'Yayınevi',
            dataIndex: 'publisher',
            width: 120,
        },
        {
            title: 'Dil',
            dataIndex: 'lang',
            width: 60,
        },
        {
            title: 'Durum',
            key: 'status',
            width: 200,
            render: (_, record, index) => {
                const conflict = record.conflict;
                
                if (!conflict.hasConflict) {
                    return <Tag color="green">Yeni Kitap</Tag>;
                }

                switch (conflict.type) {
                    case 'exact_duplicate':
                        return (
                            <Space direction="vertical" size="small">
                                <Tag color="red">Duplicate Mevcut</Tag>
                                <Space>
                                    <Button size="small" type="primary" danger 
                                            onClick={() => handleConflictDecision(index, 'force_import')}>
                                        Yine de Ekle
                                    </Button>
                                    <Button size="small" 
                                            onClick={() => handleConflictDecision(index, 'skip')}>
                                        Atla
                                    </Button>
                                </Space>
                            </Space>
                        );
                    case 'new_edition':
                    case 'different_edition':
                        return (
                            <Space direction="vertical" size="small">
                                <Tag color="orange">Baskı Çakışması</Tag>
                                <Space>
                                    <Button size="small" type="primary" 
                                            onClick={() => handleConflictDecision(index, 'add_edition')}>
                                        Baskı Olarak Ekle
                                    </Button>
                                    <Button size="small" 
                                            onClick={() => handleConflictDecision(index, 'skip')}>
                                        Atla
                                    </Button>
                                </Space>
                            </Space>
                        );
                    case 'missing_writers':
                    case 'missing_publisher':
                        return <Tag color="red">{conflict.message}</Tag>;
                    default:
                        return <Tag color="gray">Bilinmeyen</Tag>;
                }
            }
        }
    ];

    return (
        <div className="book-import-container">
            <Card>
                <Title level={2}>Toplu Kitap İçe Aktarma</Title>
                <Text type="secondary">
                    CSV dosyası ile toplu kitap ekleme sistemi. Mükerrer kitap kontrolü ve çakışma yönetimi ile güvenli içe aktarma.
                </Text>

                <Steps current={currentStep} style={{ margin: '20px 0' }}>
                    <Step title="Dosya Yükleme" icon={<UploadOutlined />} />
                    <Step title="Önizleme ve Çakışma Yönetimi" icon={<ExclamationCircleOutlined />} />
                    <Step title="İçe Aktarma Sonuçları" icon={<CheckCircleOutlined />} />
                </Steps>

                {currentStep === 0 && (
                    <div className="upload-step">
                        <Card>
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <div>
                                    <Title level={4}>1. Şablon İndirin</Title>
                                    <Text>Önce CSV şablonunu indirin ve kitap bilgilerini doğru formatta hazırlayın.</Text>
                                    <br />
                                    <Button 
                                        icon={<DownloadOutlined />} 
                                        onClick={downloadTemplate}
                                        style={{ marginTop: 8 }}
                                    >
                                        CSV Şablonu İndir
                                    </Button>
                                </div>

                                <Divider />

                                <div>
                                    <Title level={4}>2. CSV Dosyası Yükleyin</Title>
                                    <Text>Hazırladığınız CSV dosyasını yükleyin. Sistem otomatik olarak çakışma analizi yapacaktır.</Text>
                                    <br />
                                    <Upload
                                        accept=".csv"
                                        beforeUpload={uploadCsv}
                                        showUploadList={false}
                                        style={{ marginTop: 8 }}
                                    >
                                        <Button icon={<UploadOutlined />} loading={uploading}>
                                            CSV Dosyası Seç
                                        </Button>
                                    </Upload>
                                </div>

                                {errors.length > 0 && (
                                    <Alert
                                        message="Dosyada Hatalar Tespit Edildi"
                                        description={
                                            <ul>
                                                {errors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        }
                                        type="error"
                                        showIcon
                                    />
                                )}
                            </Space>
                        </Card>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="preview-step">
                        <Card>
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Title level={4}>Kitap Önizleme ve Çakışma Yönetimi</Title>
                                    <Space>
                                        <Button onClick={resetImport}>Baştan Başla</Button>
                                        <Button 
                                            type="primary" 
                                            onClick={processImport}
                                            loading={processing}
                                        >
                                            İçe Aktarmayı Başlat
                                        </Button>
                                    </Space>
                                </div>

                                <Alert
                                    message="Çakışma Durumları"
                                    description={
                                        <ul>
                                            <li><Tag color="green">Yeni Kitap</Tag>: Kitap sisteme eklenecek</li>
                                            <li><Tag color="red">Duplicate Mevcut</Tag>: Aynı kitap zaten mevcut</li>
                                            <li><Tag color="orange">Baskı Çakışması</Tag>: Farklı baskı/çeviri olarak eklenebilir</li>
                                        </ul>
                                    }
                                    type="info"
                                    showIcon
                                />

                                <Table
                                    columns={previewColumns}
                                    dataSource={booksPreview.map((book, index) => ({ ...book, key: index }))}
                                    scroll={{ x: 1000 }}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                />
                            </Space>
                        </Card>
                    </div>
                )}

                {currentStep === 2 && importResults && (
                    <div className="results-step">
                        <Card>
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Title level={4}>İçe Aktarma Sonuçları</Title>
                                    <Button type="primary" onClick={resetImport}>
                                        Yeni İçe Aktarma
                                    </Button>
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <Card size="small" style={{ flex: 1 }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                                            <Title level={3} style={{ margin: '8px 0 4px', color: '#52c41a' }}>
                                                {importResults.imported}
                                            </Title>
                                            <Text>Başarıyla Eklendi</Text>
                                        </div>
                                    </Card>

                                    <Card size="small" style={{ flex: 1 }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <ExclamationCircleOutlined style={{ fontSize: '32px', color: '#faad14' }} />
                                            <Title level={3} style={{ margin: '8px 0 4px', color: '#faad14' }}>
                                                {importResults.skipped}
                                            </Title>
                                            <Text>Atlandı</Text>
                                        </div>
                                    </Card>

                                    <Card size="small" style={{ flex: 1 }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <CloseCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                                            <Title level={3} style={{ margin: '8px 0 4px', color: '#ff4d4f' }}>
                                                {importResults.errors}
                                            </Title>
                                            <Text>Hata</Text>
                                        </div>
                                    </Card>
                                </div>

                                {importResults.importedBooks.length > 0 && (
                                    <div>
                                        <Title level={5}>Eklenen Kitaplar:</Title>
                                        <ul>
                                            {importResults.importedBooks.map((book, index) => (
                                                <li key={index}>
                                                    <strong>{book.name}</strong> - {book.publisher} 
                                                    {book.isOriginal ? ' (Orijinal)' : ' (Baskı)'}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {importResults.errorMessages.length > 0 && (
                                    <Alert
                                        message="Hatalar"
                                        description={
                                            <ul>
                                                {importResults.errorMessages.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        }
                                        type="error"
                                        showIcon
                                    />
                                )}

                                {importResults.skippedReasons.length > 0 && (
                                    <Alert
                                        message="Atlanan Kitaplar"
                                        description={
                                            <ul>
                                                {importResults.skippedReasons.map((reason, index) => (
                                                    <li key={index}>{reason}</li>
                                                ))}
                                            </ul>
                                        }
                                        type="warning"
                                        showIcon
                                    />
                                )}
                            </Space>
                        </Card>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default BookImport;