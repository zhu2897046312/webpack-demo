// 通过 TypeScriptAliasPlugin 实现短路径引用
import { Button } from '$component-a';
import { Card } from '$component-b';

console.log(Button({ label: 'Hello' }));
console.log(Card({ title: 'Card', content: 'Content' }));
