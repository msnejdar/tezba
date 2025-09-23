declare module 'mammoth' {
  interface ConvertOptions {
    arrayBuffer?: ArrayBuffer;
    path?: string;
  }

  interface Result {
    value: string;
    messages: any[];
  }

  export function extractRawText(options: ConvertOptions): Promise<Result>;
  export function convertToHtml(options: ConvertOptions): Promise<Result>;
}