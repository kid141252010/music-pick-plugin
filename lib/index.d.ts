import { Context, Schema } from 'koishi';
export declare const name = "koishi-plugin-music-pick";
export declare const inject: {
    required: string[];
    optional: string[];
};
export declare const usage = "\n## Met-API \u70B9\u6B4C\u63D2\u4EF6\n\n\u57FA\u4E8E\u53EF\u914D\u7F6E API \u7684\u70B9\u6B4C\u63D2\u4EF6\u3002\n\n### \u4E3B\u8981\u529F\u80FD\n- \u4F7F\u7528 `\u70B9\u6B4C [\u5173\u952E\u8BCD]` \u6307\u4EE4\u641C\u7D22\u97F3\u4E50\u3002\n- \u652F\u6301\u901A\u8FC7\u5E8F\u53F7\u9009\u62E9\u6B4C\u66F2\uFF0C\u6216\u4F7F\u7528 `-n` \u9009\u9879\u76F4\u63A5\u70B9\u6B4C\u3002\n- \u652F\u6301\u540C\u7FA4\u5E76\u53D1\u70B9\u6B4C\uFF1B\u540C\u4E00\u7528\u6237\u91CD\u590D\u53D1\u8D77\u4F1A\u8986\u76D6\u4E0A\u4E00\u6761\u5F85\u9009\u8BF7\u6C42\u3002\n- \u81EA\u52A8\u89E3\u6790\u804A\u5929\u4E2D\u7684 QQ \u97F3\u4E50\u5361\u7247\u5E76\u8FDB\u884C\u70B9\u6B4C\u3002\n- \u5C06\u6B4C\u66F2\u4FE1\u606F\u4EE5\u5408\u5E76\u8F6C\u53D1\u7684\u5F62\u5F0F\u53D1\u9001\uFF0C\u63D0\u4F9B\u66F4\u4F73\u7684\u5C55\u793A\u6548\u679C\u3002\n";
type FieldType = "text" | "image" | "audio" | "video" | "file";
interface ReturnField {
    data: string;
    describe: string;
    type: FieldType;
    enable: boolean;
}
export declare const Config: Schema<Schemastery.ObjectS<{
    commandName: Schema<string, string>;
    apilink: Schema<string, string>;
    proxyUrl: Schema<string, string>;
    waitTimeout: Schema<number, number>;
    exitCommand: Schema<string, string>;
    searchLimit: Schema<number, number>;
    musicLevel: Schema<"HQ" | "SQ" | "RS" | "DA" | "QAI", "HQ" | "SQ" | "RS" | "DA" | "QAI">;
    retryCount: Schema<number, number>;
    retryDelay: Schema<number, number>;
    sendRetryCount: Schema<number, number>;
    sendRetryDelay: Schema<number, number>;
    sendRetryBackoff: Schema<number, number>;
    onebotResponseTimeout: Schema<number, number>;
    onebotDirectUploadThresholdMB: Schema<number, number>;
    onebotStrictRemoteUpload: Schema<boolean, boolean>;
    onebotRemoteUploadBaseUrl: Schema<string, string>;
    inlineMediaMaxSizeMB: Schema<number, number>;
    oversizeFallbackTip: Schema<string, string>;
}> | Schemastery.ObjectS<{
    imageMode: Schema<boolean, boolean>;
    darkMode: Schema<boolean, boolean>;
    cardBorderColor: Schema<string, string>;
}> | Schemastery.ObjectS<{
    return_data_Field: Schema<Schemastery.ObjectS<{
        data: Schema<string, string>;
        describe: Schema<string, string>;
        type: Schema<"text" | "image" | "audio" | "video" | "file", "text" | "image" | "audio" | "video" | "file">;
        enable: Schema<boolean, boolean>;
    }>[], Schemastery.ObjectT<{
        data: Schema<string, string>;
        describe: Schema<string, string>;
        type: Schema<"text" | "image" | "audio" | "video" | "file", "text" | "image" | "audio" | "video" | "file">;
        enable: Schema<boolean, boolean>;
    }>[]>;
}> | Schemastery.ObjectS<{
    enableMiddleware: Schema<boolean, boolean>;
    isFigure: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    loggerInfo: Schema<boolean, boolean>;
}>, {
    commandName: string;
    apilink: string;
    proxyUrl: string;
    waitTimeout: number;
    exitCommand: string;
    searchLimit: number;
    musicLevel: "HQ" | "SQ" | "RS" | "DA" | "QAI";
    retryCount: number;
    retryDelay: number;
    sendRetryCount: number;
    sendRetryDelay: number;
    sendRetryBackoff: number;
    onebotResponseTimeout: number;
    onebotDirectUploadThresholdMB: number;
    onebotStrictRemoteUpload: boolean;
    onebotRemoteUploadBaseUrl: string;
    inlineMediaMaxSizeMB: number;
    oversizeFallbackTip: string;
} & import("cosmokit").Dict & {
    imageMode: boolean;
    darkMode: boolean;
    cardBorderColor: string;
} & {
    return_data_Field: Schemastery.ObjectT<{
        data: Schema<string, string>;
        describe: Schema<string, string>;
        type: Schema<"text" | "image" | "audio" | "video" | "file", "text" | "image" | "audio" | "video" | "file">;
        enable: Schema<boolean, boolean>;
    }>[];
} & {
    enableMiddleware: boolean;
    isFigure: boolean;
} & {
    loggerInfo: boolean;
}>;
export interface Config {
    commandName: string;
    waitTimeout: number;
    exitCommand: string;
    searchLimit: number;
    musicLevel: "HQ" | "SQ" | "RS" | "DA" | "QAI";
    retryCount: number;
    retryDelay: number;
    sendRetryCount: number;
    sendRetryDelay: number;
    sendRetryBackoff: number;
    onebotResponseTimeout: number;
    onebotDirectUploadThresholdMB: number;
    onebotStrictRemoteUpload: boolean;
    onebotRemoteUploadBaseUrl: string;
    inlineMediaMaxSizeMB: number;
    oversizeFallbackTip: string;
    imageMode: boolean;
    darkMode: boolean;
    cardBorderColor: string;
    return_data_Field: ReturnField[];
    enableMiddleware: boolean;
    isFigure: boolean;
    loggerInfo: boolean;
    apilink: string;
    proxyUrl: string;
}
export declare function apply(ctx: Context, config: Config): void;
export {};
