# 식당 키오스크

React + TypeScript + Vite로 만든 웹 키오스크입니다.

## 실행 방법

```bash
npm install
npm run dev
```

개발 서버가 뜨면 브라우저에서 안내된 주소로 접속하면 됩니다.

## 배포 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

## 메뉴 수정

메뉴와 가격은 [src/menu.ts](/C:/Users/ssw37/Desktop/Project_3/src/menu.ts)에서 관리하고, 메뉴 이미지는 `Photo/` 폴더에 보관합니다.

## 포함된 기능

- 카테고리별 메뉴 탐색
- 장바구니 담기, 수량 변경, 전체 비우기
- 결제 수단 선택 UI
- 주문 완료 화면과 주문번호 생성
- 데스크톱/태블릿 대응 레이아웃
