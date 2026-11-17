'use strict';
const toggle = document.getElementById('blocking');
const status = document.getElementById('status');
async function refresh() {
  try {
    toggle.checked = (await chrome.declarativeNetRequest.getEnabledRulesets()).includes('cookie_pilot_ads');
    status.textContent = toggle.checked ? '已启用广告请求拦截' : '已关闭广告请求拦截';
  } catch (error) { status.textContent = '无法读取规则：' + error.message; toggle.disabled = true; }
}
toggle.addEventListener('change', async () => {
  toggle.disabled = true;
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(toggle.checked ?
      { enableRulesetIds: ['cookie_pilot_ads'] } : { disableRulesetIds: ['cookie_pilot_ads'] });
    await refresh();
  } catch (error) { status.textContent = '修改失败：' + error.message; }
  finally { toggle.disabled = false; }
});
void refresh();
