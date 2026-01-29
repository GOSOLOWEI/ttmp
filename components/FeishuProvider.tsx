"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Script from "next/script";
import type { FeishuUser, FeishuContextType } from "@/lib/feishu/types";

const FeishuContext = createContext<FeishuContextType | undefined>(undefined);

export const useFeishu = () => {
  const context = useContext(FeishuContext);
  if (!context) {
    throw new Error("useFeishu must be used within a FeishuProvider");
  }
  return context;
};

// 扩展全局对象定义，完全匹配官方示例
declare global {
  interface Window {
    h5sdk: any;
    tt: any;
  }
}

export const FeishuProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FeishuUser | null>(null);
  const [isLark, setIsLark] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const initJSSDK = async () => {
    // 官方示例中使用 h5sdk 对象进行配置
    if (typeof window === "undefined" || !window.h5sdk) {
      console.warn("飞书 H5SDK 对象未加载完成或不在飞书环境");
      return;
    }

    try {
      // 1. 获取当前页面 URL (排除 hash) 用于签名
      const url = window.location.href.split("#")[0];
      const res = await fetch(
        `/api/feishu/config?url=${encodeURIComponent(url)}`
      );
      const config = await res.json();

      if (config.error) throw new Error(config.error);

      // 2. 按照官方 Demo 调用 h5sdk.config 进行鉴权
      window.h5sdk.config({
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: [
          "tt.requestAuthCode", // 必须显式包含所需权限
          "tt.getSystemInfo",
        ],
        // 鉴权成功回调
        onSuccess: (res: any) => {
          console.log("飞书 JSAPI 鉴权成功:", res);
          // 官方推荐在 ready 回调中执行后续逻辑
          window.h5sdk.ready(() => {
            setIsReady(true);
            performLogin();
          });
        },
        // 鉴权失败回调
        onFail: (err: any) => {
          console.error("飞书 JSAPI 鉴权失败:", err);
        },
      });
    } catch (err) {
      console.error("飞书环境初始化异常:", err);
    }
  };

  const performLogin = async () => {
    if (typeof window === "undefined" || !window.tt) return;

    try {
      // 1. 优先尝试通过后端 Session (Cookie) 恢复登录态
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const userData = await meRes.json();
        if (userData && !userData.error) {
          setUser(userData);
          console.log("从 Session 成功恢复用户信息");
          return; // 已登录，无需执行免登
        }
      }
    } catch (e) {
      console.log("Session 恢复失败，将执行免登流程");
    }

    // 2. 如果 Session 不存在或已过期，则执行飞书免登流程
    window.tt.requestAuthCode({
      appId: process.env.NEXT_PUBLIC_FEISHU_APP_ID || "",
      success: async (res: { code: string }) => {
        try {
          const authRes = await fetch("/api/feishu/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: res.code }),
          });
          const userData = await authRes.json();
          if (userData.error) throw new Error(userData.error);
          setUser(userData);
          console.log("免登成功，用户信息已获取并存入 Session");
        } catch (e) {
          console.error("免登换取用户信息失败:", e);
        }
      },
      fail: (err: any) => {
        console.error("获取免登授权码失败:", err);
      },
    });
  };

  useEffect(() => {
    // 检测是否在飞书/Lark 环境
    const ua = navigator.userAgent.toLowerCase();
    const lark = ua.indexOf("lark") > -1 || ua.indexOf("feishu") > -1;
    setIsLark(lark);
  }, []);

  return (
    <>
      <Script
        src="https://open.feishu.cn/static/js/jssdk/1.0.1/jssdk.js"
        onLoad={initJSSDK}
        strategy="afterInteractive"
      />
      <FeishuContext.Provider
        value={{ user, isLark, isReady, login: performLogin }}
      >
        {children}
      </FeishuContext.Provider>
    </>
  );
};
