// 通过 TypeScriptAliasPlugin 实现短路径引用
import { Button } from '$component-a';
import { Card } from '$component-b';

const app = document.getElementById('app');
if (app) {
  const buttonHtml = Button({ label: 'Hello' });
  const cardHtml = Card({ title: 'Card', content: 'Content' });
  app.innerHTML = `<div class="demo">${buttonHtml}</div><div class="demo">${cardHtml}</div>`;
}
console.log(Button({ label: 'Hello' }));
console.log(Card({ title: 'Card', content: 'Content' }));
