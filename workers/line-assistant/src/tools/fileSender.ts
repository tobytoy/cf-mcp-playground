export interface FileDescriptor {
  id: string;
  name: string;
  url: string;
  type: "pdf" | "image" | "excel" | "doc";
  description?: string;
}

// Built-in / preset files inventory (or queryable from R2)
const PRESET_FILES: Record<string, FileDescriptor> = {
  "report.pdf": {
    id: "report.pdf",
    name: "系統架構規劃報告.pdf",
    url: "https://raw.githubusercontent.com/toby/sample-docs/main/report.pdf",
    type: "pdf",
    description: "Cloudflare Worker 與 Needle 智慧助理完整架構書"
  },
  "sample.png": {
    id: "sample.png",
    name: "系統架構圖.png",
    url: "https://placehold.co/600x400/png?text=System+Architecture",
    type: "image",
    description: "智慧助理資料流與分層架構示意圖"
  }
};

export function lookupFile(fileIdOrQuery: string): FileDescriptor {
  const clean = fileIdOrQuery.toLowerCase().trim();

  for (const [key, file] of Object.entries(PRESET_FILES)) {
    if (clean.includes(key) || clean.includes(file.name.toLowerCase())) {
      return file;
    }
  }

  // Fallback demo file if not explicitly matched
  return {
    id: "document.pdf",
    name: "個人專屬文件.pdf",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    type: "pdf",
    description: "您所查詢的專屬文件，點擊下方按鈕即可下載。"
  };
}
