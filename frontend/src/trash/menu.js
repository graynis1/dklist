import React from 'react';
import { LaptopOutlined, NotificationOutlined, UserOutlined } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
const { Content, Sider } = Layout;

const items2 = [UserOutlined, LaptopOutlined, NotificationOutlined, UserOutlined, LaptopOutlined, NotificationOutlined, UserOutlined, LaptopOutlined,UserOutlined, LaptopOutlined, NotificationOutlined, UserOutlined, LaptopOutlined, NotificationOutlined, UserOutlined, LaptopOutlined, NotificationOutlined, UserOutlined, LaptopOutlined, NotificationOutlined].map((icon, index) => {
  const key = String( index + 1 );
  return {
    key: `sub${key}`,
    icon: React.createElement(icon),
    label: `subnav ${key}`,
    children: new Array(4).fill(null).map((_, j) => {
      const subKey = index * 4 + j + 1;
      return {
        key: subKey,
        label: `option${subKey}`,
      };
    }),
  };
});
const App = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  return (
    <Layout>
        <Sider
          width={200}
          style={{
            background: colorBgContainer,
            height: '100vh',
            overflow:'auto',
            position:'relative'
          }}
        >
            <div style={{width:'100%', height:100, position:'sticky', top:0, backgroundColor:'white', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1}}>
                <img src='/images/dklist.png' style={{width:'60%', height:'60%', objectFit:'contain'}}/>
            </div>

            <Menu
                mode="inline"
                defaultSelectedKeys={['1']}
                style={{
                    borderRight: 0,
                }}
                items={items2}
            />

        </Sider>
        <Layout
          style={{
            padding: '0 24px 24px',
          }}
        >
          <Breadcrumb style={{ margin: '16px 0' }} >
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>List</Breadcrumb.Item>
            <Breadcrumb.Item>App</Breadcrumb.Item>
          </Breadcrumb>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: colorBgContainer,
            }}
          >
            Content
          </Content>
        </Layout>
    </Layout>
  );
};
export default App;