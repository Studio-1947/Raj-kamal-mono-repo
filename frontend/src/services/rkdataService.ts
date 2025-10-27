import { apiClient } from '../lib/apiClient';

export type RkDataItem = {
  id: string;
  slNo: number | null;
  date: string | null;
  orderId: string | null;
  orderStatus: string | null;
  isbn: string | null;
  title: string | null;
  author: string | null;
  category: string | null;
  publicationName: string | null;
  releaseDate: string | null;
  noOfPages: number | null;
  name: string | null;
  pincode: string | null;
  gender: string | null;
  ageGroup: string | null;
  mobile: string | null;
  email: string | null;
  membershipId: string | null;
  paymentMode: string | null;
  mrp: number | null;
  sellingPrice: number | null;
  discountCouponCode: string | null;
  createdAt: string;
};

export async function rkdataImport(): Promise<{ ok: boolean; totalRows: number; inserted: number; errors: number }>
{
  const res = await apiClient.post<any>('rkdata/import');
  return res;
}

export async function rkdataList(params?: { limit?: number; cursorId?: string }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.cursorId) q.set('cursorId', params.cursorId);
  const url = `rkdata/${q.toString() ? `?${q.toString()}` : ''}`;
  return apiClient.get<{ ok: boolean; items: RkDataItem[]; nextCursorId: string | null; missingTable?: boolean }>(url);
}

export async function rkdataSummary() {
  return apiClient.get<{
    ok: boolean;
    totalCount: number;
    totalMrp: number;
    totalSelling: number;
    byOrderStatus: { orderStatus: string; count: number }[];
    byPaymentMode: { paymentMode: string; count: number }[];
    missingTable?: boolean;
  }>('rkdata/summary');
}
