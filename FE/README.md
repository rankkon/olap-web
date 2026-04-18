# DWH OLAP FE

Frontend React + TypeScript cho bài tập lớn Kho dữ liệu.
Hiện tại FE dùng dữ liệu mock để dựng đầy đủ khung giao diện trước, chưa gọi BE.

## Chạy dự án

```bash
npm install
npm run dev
```

Mặc định Vite chạy ở `http://localhost:5173`.

## Scripts

- `npm run dev`: chạy môi trường local
- `npm run lint`: kiểm tra code style
- `npm run build`: build production
- `npm run preview`: xem bản build local

## Cấu trúc chính

- `src/main.tsx`: entrypoint
- `src/router.tsx`: định tuyến toàn app
- `src/pages`: các trang chính (`Dashboard`, `OLAP Explorer`, `Reports`, `Validation`)
- `src/components`: UI theo nhóm (`layout`, `common`, `charts`, `tables`)
- `src/hooks`: state logic mock (`useOlap`, `useReport`, `useFilters`)
- `src/utils/constants.ts`: metadata route, options filter, mock data

## Trạng thái hiện tại

- FE đã có đầy đủ khung cho 9 báo cáo + OLAP explorer.
- Chưa tích hợp API backend/SSAS.
- Các vị trí sẽ nối BE đã được đánh dấu `TODO` trong giao diện.
