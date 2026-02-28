// 通过 TypeScriptAliasPlugin 实现短路径引用
import { Button } from '$component-a';
import { Card } from '$component-b';

declare const __ALIAS_SOURCE_MODE__: boolean;

const app = document.getElementById('app');
if (app) {
  const isSourceMode = typeof __ALIAS_SOURCE_MODE__ !== 'undefined' ? __ALIAS_SOURCE_MODE__ : true;
  const modeLabel = isSourceMode ? '源码引用 (src)' : '产物引用 (dist)';
  const modeDesc = isSourceMode
    ? 'Webpack 直接转译 SDK 源码，无需先打包 SDK，适合本地开发。'
    : 'Webpack 使用 SDK 的 dist 产物，需先执行 pnpm --filter @monorepo/sdk run build。';

  const buttonHtml = Button({ label: 'Hello' });
  const cardHtml = Card({ title: 'Card', content: 'Content' });

  app.innerHTML = `
    <div class="demo-panel">
      <div class="demo-panel-header">
        <span class="demo-panel-badge">TypeScriptAliasPlugin 演示</span>
        <span class="demo-panel-mode">当前: ${modeLabel}</span>
        <button type="button" id="demo-btn" class="demo-btn">查看插件说明 / 如何切换</button>
      </div>
      <div id="demo-tip" class="demo-tip" style="display:none;">
        <p><strong>${modeLabel}</strong></p>
        <p>${modeDesc}</p>
        <p class="demo-tip-cmd">切换方式：重启 dev 时设置环境变量<br>
          <code>USE_SOURCE_ALIAS=true</code> → 源码（默认）<br>
          <code>USE_SOURCE_ALIAS=false</code> → dist 产物<br>
          <span class="demo-tip-small">PowerShell: $env:USE_SOURCE_ALIAS=\"false\"; pnpm run start</span>
        </p>
        <p class="demo-tip-small">解决背景问题：长路径、重复打包 → 短路径 + 开发时跳过 SDK 打包，一次转译。</p>
      </div>
    </div>
    <div class="demo">${buttonHtml}</div>
    <div class="demo">${cardHtml}</div>
  `;

  const tipEl = document.getElementById('demo-tip');
  const btnEl = document.getElementById('demo-btn');
  if (btnEl && tipEl) {
    btnEl.addEventListener('click', () => {
      const show = tipEl.style.display === 'none';
      tipEl.style.display = show ? 'block' : 'none';
      (btnEl as HTMLButtonElement).textContent = show ? '收起说明' : '查看插件说明 / 如何切换';
    });
  }
}

console.log(Button({ label: 'Hello' }));
console.log(Card({ title: 'Card', content: 'Content' }));
