import { App } from './App';
import { runMatterSpike } from './engine/spike';
import './style.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('#app root element not found');
}

// 구현자 계약: 스텝 0 직후 스파이크(블록 3개 + 발사체 1개 충돌) 수동 1회 확인용.
// 사용법: 개발 서버에서 ?spike=1 쿼리스트링으로 접속하면 콘솔에 collisionStart 로그가 남는다.
if (new URLSearchParams(window.location.search).has('spike')) {
  runMatterSpike();
}

const app = new App(root);
app.start();
