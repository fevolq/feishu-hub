import type { FeishuCredentials } from "@/modules/organization/domain/types";
import { appConfig } from "@/shared/server/config";
import type { FeishuRawApiPage, FeishuResponse } from "./raw-snapshot";

type PagedData<T> = {
  items?: T[];
  page_token?: string;
  has_more?: boolean;
};

const FEISHU_PAGE_SIZE = 50;

const readFeishuResponse = async <T>(response: Response): Promise<FeishuResponse<T>> => {
  return (await response.json().catch(() => ({}))) as FeishuResponse<T>;
};

export class FeishuTransport {
  private token: string | null = null;

  constructor(private readonly credentials: FeishuCredentials) {}

  private async auth() {
    if (this.token) {
      return this.token;
    }

    const response = await fetch(`${appConfig.feishuApiBaseUrl}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.credentials.appId,
        app_secret: this.credentials.appSecret
      })
    });

    const body = await readFeishuResponse<unknown>(response);
    if (!response.ok) {
      throw new Error(`飞书认证请求失败: HTTP ${response.status} ${body.msg || body.code || ""}`.trim());
    }
    if (body.code !== 0 || !body.tenant_access_token) {
      throw new Error(`飞书认证失败: ${body.msg || body.code}`);
    }

    this.token = body.tenant_access_token;
    return this.token;
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number | undefined>,
    onResponse?: (page: FeishuRawApiPage) => void
  ) {
    const token = await this.auth();
    const url = new URL(`${appConfig.feishuApiBaseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const body = await readFeishuResponse<T>(response);
    if (!response.ok) {
      throw new Error(`飞书接口请求失败: HTTP ${response.status} ${body.msg || body.code || ""}`.trim());
    }
    if (body.code !== 0) {
      throw new Error(`飞书接口返回错误: ${body.msg || body.code}`);
    }
    onResponse?.({
      requestUrl: url.toString(),
      response: body as FeishuResponse<unknown>
    });
    return body.data as T;
  }

  async getAllPages<T>(
    path: string,
    params: Record<string, string | number | undefined>,
    onPage?: (page: FeishuRawApiPage) => void
  ): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;

    do {
      const data = await this.get<PagedData<T>>(
        path,
        {
          ...params,
          page_size: FEISHU_PAGE_SIZE,
          page_token: pageToken
        },
        onPage
      );
      items.push(...(data.items || []));
      pageToken = data.has_more ? data.page_token : undefined;
    } while (pageToken);

    return items;
  }
}
