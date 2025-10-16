// src/lib/utils/parse-raw-data.ts
import { Json } from "@/lib/types/generated";

export interface ParsedRawData {
  title: string;
  data: Array<{ key: string; value: any }>;
}

export function parseRawData(rawData: Json | null): ParsedRawData | null {
  if (!rawData) return null;
  
  try {
    // If it's already an object, use it directly
    const data = typeof rawData === 'object' ? rawData : JSON.parse(String(rawData));
    
    // Handle different possible structures
    if (Array.isArray(data)) {
      return {
        title: 'Raw Data',
        data: data.map((item, index) => ({
          key: `Item ${index + 1}`,
          value: JSON.stringify(item, null, 2)
        }))
      };
    }

    if (data instanceof Error) {
      return {
        title: 'Error Details',
        data: [
          { key: 'Name', value: data.name },
          { key: 'Message', value: data.message },
          { key: 'Stack', value: data.stack }
        ].filter(item => item.value)
      };
    }

    // Handle plain objects
    return {
      title: 'Raw Data',
      data: Object.entries(data).map(([key, value]) => ({
        key: key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      }))
    };
  } catch (error) {
    return {
      title: 'Raw Data',
      data: [{ key: 'Error', value: 'Failed to parse raw data' }]
    };
  }
}