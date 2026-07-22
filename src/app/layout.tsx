import type { Metadata } from "next";
import "@arco-design/web-react/dist/css/arco.css";
import { ArcoReact19Adapter } from "@/shared/ui/ArcoReact19Adapter";
import "./globals.css";

export const metadata: Metadata = {
  title: "飞书组织",
  description: "单机版飞书组织数据同步后台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ArcoReact19Adapter>{children}</ArcoReact19Adapter>
      </body>
    </html>
  );
}

