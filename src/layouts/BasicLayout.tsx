import {Avatar, Dropdown, Icon, Layout, Menu, message, Spin, Tag} from "antd";
import classNames from "classnames";
import {connect} from "dva";
import {Link, Redirect, Route, Switch} from "dva/router";
import {groupBy} from "lodash";
import moment from "moment";
import PropTypes from "prop-types";
import React from "react";
import {ContainerQuery} from "react-container-query";
import {getNavData} from "../common/nav";
import GlobalFooter from "../components/GlobalFooter";
import HeaderSearch from "../components/HeaderSearch";
import NoticeIcon from "../components/NoticeIcon";
import NotFound from "../routes/Exception/404";
import { getRouteData } from "../utils/utils";

import styles from "./BasicLayout.less";

const {Header, Sider, Content} = Layout;
const {SubMenu} = Menu;

const query = {
  "screen-xs": {
    maxWidth: 575,
  },
  "screen-sm": {
    maxWidth: 767,
    minWidth: 576,
  },
  "screen-md": {
    maxWidth: 991,
    minWidth: 768,
  },
  "screen-lg": {
    maxWidth: 1199,
    minWidth: 992,
  },
  "screen-xl": {
    minWidth: 1200,
  },
};

interface IProps {
  dispatch?: any;
  currentUser?: any;
  collapsed?: any;
  fetchingNotices?: any;
  location?: any;
  notices?: any;
}

interface IState {
  openKeys?: any;
}

@connect((state) => ({
  collapsed: state.global.collapsed,
  currentUser: state.user.currentUser,
  fetchingNotices: state.global.fetchingNotices,
  notices: state.global.notices,
}))
class BasicLayout extends React.PureComponent<IProps, IState> {
  // TODO 像java一样定义变量
  public menus: any;
  public resizeTimeout: any;

  constructor(props) {
    super(props);
    this.menus = getNavData().reduce((arr, current) => arr.concat(current.children), []);
    this.state = {
      openKeys: this.getDefaultCollapsedSubMenus(props),
    };
  }

  public componentDidMount() {
    this.props.dispatch({
      type: "user/fetchCurrent",
    });
  }

  public componentWillUnmount() {
    // clearTimeout(this.resizeTimeout);
  }

  // 折叠
  public onCollapse = (collapsed) => {
    this.props.dispatch({
      type: "global/changeLayoutCollapsed",
      payload: collapsed,
    });
  }

  public getCurrentMenuSelectedKeys= (props?) => {
    const {location: {pathname}} = props || this.props;
    const keys = pathname.split("/").slice(1);
    if (keys.length === 1 && keys[0] === "") {
      return [this.menus[0].key];
    }
    return keys;
  }

  public getDefaultCollapsedSubMenus= (props) => {
    const currentMenuSelectedKeys = [...this.getCurrentMenuSelectedKeys(props)];
    currentMenuSelectedKeys.splice(-1, 1);
    if (currentMenuSelectedKeys.length === 0) {
      return ["dashboard"];
    }
    return currentMenuSelectedKeys;
  }

  public handleOpenChange = (openKeys) => {
    const lastOpenKey = openKeys[openKeys.length - 1];
    const isMainMenu = this.menus.some(
      (item) => (item.key === lastOpenKey || item.path === lastOpenKey),
    );
    this.setState({
      openKeys: isMainMenu ? [lastOpenKey] : [...openKeys],
    });
  }

  public getNavMenuItems = (menusData, parentPath = "") => {
    const { location } = this.props;

    if (!menusData) {
      return [];
    }
    return menusData.map((item) => {
      if (!item.name) {
        return null;
      }
      let itemPath;
      if (item.path.indexOf("http") === 0) {
        itemPath = item.path;
      } else {
        itemPath = `${parentPath}/${item.path || ""}`.replace(/\/+/g, "/");
      }
      if (item.children && item.children.some((child) => child.name)) {
        return(
          <SubMenu
            title={
              item.icon ? (
                <span>
                  <Icon type={item.icon}/>
                  <span>{item.name}</span>
                </span>
              ) : item.name
            }
            key={item.key || item.path}
          >
            {this.getNavMenuItems(item.children, itemPath)}
          </SubMenu>
        );
      }
      const icon = <Icon type={item.icon} />;

      return (
        <Menu.Item key={item.key || item.path}>
          {
            /^https?:\/\//.test(itemPath) ? (
              <a href={itemPath} target={item.target}>
                {icon}<span>{item.name}</span>
              </a>
            ) : (
              <Link
                to={itemPath}
                target={item.target}
                replace={itemPath === location.pathname}
              >
                {icon}<span>{item.name}</span>
              </Link>
            )
          }
        </Menu.Item>
      );
    });
  }

  public toggle = () => {
    const { collapsed } = this.props;
    this.props.dispatch({
      type: "global/changeLayoutCollapsed",
      payload: !collapsed,
    });

    // TODO  不懂这段的用处
    this.resizeTimeout = setTimeout(() => {
      const event = document.createEvent("HTMLEvents");
      event.initEvent("resize", true, false);
      window.dispatchEvent(event);
    }, 600);

  }

  public getNoticeData= () => {
    const { notices = [] } = this.props;
    if (notices.length === 0) {
      return {};
    }
    const newNotices = notices.map((notice) => {
      const newNotice = { ...notice };
      if (newNotice.datetime) {
        newNotice.datetime = moment(notice.datetime).fromNow();
      }
      // transform id to item key
      if (newNotice.id) {
        newNotice.key = newNotice.id;
      }
      if (newNotice.extra && newNotice.status) {
        const color = ({
          todo: "",
          processing: "blue",
          urgent: "red",
          doing: "gold",
        })[newNotice.status];
        newNotice.extra = <Tag color={color} style={{ marginRight: 0 }}>{newNotice.extra}</Tag>;
      }
      return newNotice;
    });
    return groupBy(newNotices, "type");
  }

  public render() {

    const {currentUser, collapsed, fetchingNotices} = this.props;

    const menu = (
      <Menu className="menu">
        <Menu.Item disabled><Icon type="user"/>个人中心</Menu.Item>
        <Menu.Item disabled><Icon type="setting"/>设置</Menu.Item>
        <Menu.Divider/>
        <Menu.Item key="logout"><Icon type="logout"/>退出登录</Menu.Item>
      </Menu>
    );

    const noticeData = this.getNoticeData();

    // Don't show popup menu when it is been collapsed
    const menuProps = collapsed ? {} : {
      openKeys: this.state.openKeys,
    };

    const layout = (
      <Layout>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          breakpoint="md"
          onCollapse={this.onCollapse}
          width={256}
          className={styles.sider}
        >
          <div className={styles.logo}>
            <Link to={"/"}>
              <img src="https://gw.alipayobjects.com/zos/rmsportal/iwWyPinUoseUxIAeElSx.svg" alt="logo"/>
              <h1>Ant Design Pro</h1>
            </Link>
          </div>
          <Menu
            theme={"dark"}
            mode={"inline"}
            {...menuProps}
            onOpenChange={this.handleOpenChange}
            selectedKeys={this.getCurrentMenuSelectedKeys()}
            style={{margin: "16px 0", width: "100%"}}
          >
            {this.getNavMenuItems(this.menus)}
          </Menu>
        </Sider>
        <Layout>
          <Header className={styles.header}>
            <Icon
              className={styles.trigger}
              type={collapsed ? "menu-unfold" : "menu-fold"}
              onClick={this.toggle}
            />
            <div className={styles.right}>
              <HeaderSearch
                className={`${styles.action} ${styles.search}`}
                placeholder={"站内搜索"}
                dataSource={["搜索提示一", "搜索提示二", "搜索提示三"]}
                onSearch={(value) => {
                  console.log("input", value);
                }}
                onPressEnter={(value) => {
                  console.log("enter", value); // eslint-disable-line
                }}
              />
{/*              <NoticeIcon
                className={styles.action}
                count={currentUser.notifyCount}
                onItemClick={(item, tabProps) => {
                  console.log(item, tabProps);
                }}
                onClear={this.handleNoticeClear}
                onPopupVisibleChange={this.handleNoticeVisibleChange}
                loading={fetchingNotices}
              >
                <NoticeIcon.Tab
                  list={noticeData.通知}
                  title="通知"
                  emptyText="你已查看所有通知"
                  emptyImage="https://gw.alipayobjects.com/zos/rmsportal/wAhyIChODzsoKIOBHcBk.svg"
                />
                <NoticeIcon.Tab
                  list={noticeData.消息}
                  title="消息"
                  emptyText="您已读完所有消息"
                  emptyImage="https://gw.alipayobjects.com/zos/rmsportal/sAuJeJzSKbUmHfBQRzmZ.svg"
                />
                <NoticeIcon.Tab
                  list={noticeData.待办}
                  title="待办"
                  emptyText="你已完成所有待办"
                  emptyImage="https://gw.alipayobjects.com/zos/rmsportal/HsIsxMZiWKrNUavQUXqx.svg"
                />
              </NoticeIcon>*/}
              {
                currentUser.name ? (
                  <Dropdown overlay={menu}>
                    <span className={`${styles.action} ${styles.account}`}>
                      <Avatar size={"small"} className={styles.avatar} src={currentUser.avatar}/>
                    </span>
                  </Dropdown>
                ) : <Spin size="small" style={{ marginLeft: 8 }} />
              }
            </div>
          </Header>
          <Content style={{ margin: "24px 24px 0", height: "100%" }}>
            <Switch>
              {
                getRouteData("BasicLayout").map((item) => (
                  <Route
                    exact={item.exact}
                    key={item.path}
                    path={item.path}
                    component={item.component}
                  />
                ))
              }
              <Redirect exact from="/" to="/dashboard/table-list" />
              <Route component={NotFound} />
            </Switch>
            <GlobalFooter
              links={[{
                title: "Pro 首页",
                href: "http://pro.ant.design",
                blankTarget: true,
              }, {
                title: "GitHub",
                href: "https://github.com/ant-design/ant-design-pro",
                blankTarget: true,
              }, {
                title: "Ant Design",
                href: "http://ant.design",
                blankTarget: true,
              }]}
              copyright={
                <div>
                  Copyright <Icon type="copyright" /> 2017 蚂蚁金服体验技术部出品
                </div>
              }
           />
          </Content>
        </Layout>
      </Layout>
    );

    return (
      <ContainerQuery query={query}>
        {(params) => <div className={classNames(params)}>{layout}</div>}
      </ContainerQuery>
    );
  }
}

export default BasicLayout;