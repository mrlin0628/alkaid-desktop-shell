# 檔案在specs中

## 待解決問題

解決後標記

- [x] 背景顏色選擇後沒有更新但是影片可以正確選擇
  - ✅ 2025-08-22 已修復：修正 Desktop.svelte 中 containerStyle 的 $derived 表達式

- [x] 刷新頁面影片會消失，static uploads backgrounds裡面其實只要儲存一個background.mp4即可，每次預設載入這個影片，至後上傳的就覆蓋就好
  - ✅ 2025-08-22 已修復：
    - 修改上傳 API 總是覆蓋同一個檔案 (background.mp4)
    - 加入 localStorage 支援保存背景設定
    - 刷新頁面後會自動載入已上傳的影片
