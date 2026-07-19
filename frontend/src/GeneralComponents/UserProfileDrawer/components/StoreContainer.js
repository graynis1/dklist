import React from 'react';
import { useProfile } from '../../../Context/UserProfileContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Image } from 'antd';
import { ShopOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const StoreContainer = () => {
    const { profileData } = useProfile();
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (!profileData?.store || profileData.store.length === 0) {
        return null;
    }

    const handleStoreClick = (slug) => {
        navigate(`/askida-kitap/${slug}`);
    };

    return (
        <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Title level={5} style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center' }}>
                <ShopOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                {t('askidaki_kitaplarim')} ({profileData.store.length})
            </Title>

            <Row gutter={[8, 8]}>
                {profileData.store.map((store) => (
                    <Col span={24} key={store.id}>
                        <Card
                            hoverable
                            size="small"
                            onClick={() => handleStoreClick(store.slug)}
                            style={{ 
                                cursor: 'pointer',
                                borderRadius: '6px',
                                overflow: 'hidden'
                            }}
                            bodyStyle={{ padding: '8px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Image
                                    src={store.image}
                                    alt={store.title}
                                    width={40}
                                    height={40}
                                    style={{ 
                                        borderRadius: '4px',
                                        objectFit: 'cover',
                                        marginRight: '8px'
                                    }}
                                    fallback="/images/no-image.png"
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Text 
                                        strong 
                                        style={{ 
                                            fontSize: '12px',
                                            display: 'block',
                                            marginBottom: '2px'
                                        }}
                                        ellipsis={{ tooltip: store.title }}
                                    >
                                        {store.title}
                                    </Text>
                                    <Text 
                                        type="secondary" 
                                        style={{ fontSize: '10px' }}
                                    >
                                        Askıda Kitap
                                    </Text>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default StoreContainer; 