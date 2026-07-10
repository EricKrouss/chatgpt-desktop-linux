#!/usr/bin/env node

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Pin the feature config so a developer's local gitignored features.json
// cannot change which patch descriptors these core tests exercise.
process.env.CODEX_LINUX_FEATURES_CONFIG = path.join(
  __dirname,
  "..",
  "linux-features",
  "features.example.json",
);

const {
  applyAutomationScheduleMultiTimePatch,
  patchAutomationScheduleAssets,
} = require("./patches/impl/automation-schedule.js");
const {
  COMPUTER_USE_UI_ENV_VAR,
  COMPUTER_USE_UI_SETTINGS_KEY,
  applyLinuxComputerUseFeaturePatch,
  applyLinuxComputerUseInstallFlowPatch,
  applyLinuxNativeDesktopAppsHandlerPatch,
  applyLinuxComputerUsePluginGatePatch,
  applyLinuxComputerUseRendererAvailabilityPatch,
  isComputerUseUiEnabled,
} = require("./patches/impl/computer-use.js");
const {
  keybindsSettingsAsset,
  linuxDesktopSettingsAsset,
  applyLinuxDesktopSettingsIndexPatch,
  applyLinuxDesktopSettingsSectionsPatch,
  applyLinuxDesktopSettingsSharedPatch,
  patchKeybindsSettingsAssets,
} = require("./patches/impl/keybinds-settings.js");
const {
  applyLinuxAvatarOverlayMousePassthroughPatch,
} = require("./patches/impl/avatar-overlay.js");
const {
  applyBrowserUseNodeReplApprovalPatch,
  applyBrowserUseNodeReplApprovalAssets,
  applyLinuxBrowserUseRouteLivenessPatch,
  applyLinuxChromeExtensionStatusPatch,
  applyLinuxExternalOpenEnvPatch,
} = require("./patches/impl/main-process/browser.js");
const {
  applyLinuxChromeNativeHostRuntimePatch,
  applyLinuxChromePluginAutoInstallPatch,
} = require("./patches/impl/chrome-plugin.js");
const {
  applyLinuxAboutDialogPatch,
  applyLinuxApplicationMenuPatch,
  applyLinuxMenuPatch,
  applyLinuxNativeTitlebarPatch,
  applyLinuxOpaqueBackgroundPatch,
  applyLinuxReadyToShowWindowStatePatch,
  applyLinuxResizeRepaintPatch,
  applyLinuxSetIconPatch,
  applyLinuxWindowOptionsPatch,
} = require("./patches/impl/main-process/window.js");
const {
  applyLinuxBuildInfoTrayPatch,
  applyLinuxSingleInstancePatch,
  applyLinuxTrayPatch,
} = require("./patches/impl/main-process/tray.js");
const {
  applyLinuxExplicitIpcQuitPatch,
  applyLinuxExplicitQuitPromptBypassPatch,
  applyLinuxExplicitTrayQuitPatch,
  applyLinuxQuitGuardPatch,
  applyLinuxWillQuitDrainTimeoutPatch,
} = require("./patches/impl/main-process/quit-lifecycle.js");
const {
  applyLinuxFileManagerPatch,
  applyLinuxGitOriginsSourceFallbackPatch,
  applyLinuxLocalAppServerFeatureEnablementHandlerPatch,
  applyLinuxOwlFeatureBindingFallbackPatch,
  applyLinuxRemoteControlConfigPreservationPatch,
  applyLinuxTerminalUserPathPatch,
  applyLinuxWorkerFileManagerPatch,
  applyLinuxXdgDocumentsDirPatch,
  patchLinuxOwlFeatureBindingFallbackAssets,
} = require("./patches/impl/main-process/misc.js");
const {
  applyLinuxHotkeyWindowPrewarmPatch,
  applyLinuxLaunchActionArgsPatch,
  applyLinuxSettingsPersistencePatch,
  applyLinuxTrayCloseSettingPatch,
} = require("./patches/impl/launch-actions.js");
const {
  applyLinuxMultiInstanceBootstrapPatch,
} = require("./patches/impl/bootstrap.js");
const {
  applyLinuxProjectlessXdgDocumentsDirPatch,
  patchProjectlessDocumentsAssets,
} = require("./patches/impl/projectless-documents.js");
const {
  patchPackageJson,
  resolveDesktopName,
} = require("./patches/impl/package-json.js");
const {
  patchExtractedApp,
  patchMainBundleSource,
  corePatchDescriptors,
  featurePatchDescriptors,
} = require("./patches/runner.js");
const {
  discoverCorePatchDescriptors,
  normalizePatchDescriptors,
} = require("./patches/engine.js");
const {
  detectLinuxTargetContext,
  linuxTargetSummary,
  parseOsRelease,
} = require("./lib/linux-target-context.js");
const {
  enabledLinuxFeatureIds,
} = require("./lib/linux-features.js");
const {
  applyLinuxAppUpdaterBridgePatch,
  applyLinuxAppUpdaterMenuPatch,
  patchLinuxAppUpdaterBridge,
} = require("./lib/linux-update-bridge-patch.js");
const {
  validateReport,
} = require("./ci/validate-patch-report.js");
const {
  buildInfo,
  githubCommitUrl,
  packageProfile,
  sourceInfo,
  upstreamDmgSourceInfo,
} = require("./lib/build-info.js");
const {
  createPatchReport,
  criticalFailuresFromReport,
  optionalDriftFromReport,
  summarizePatchReport,
} = require("./lib/patch-report.js");
const {
  applyBrowserAnnotationScreenshotPatch,
  applyLocalEnvironmentActionModalDraftPatch,
  applyPersistentRateLimitFooterPatch,
  applyLinuxAppServerBackfillWaitPatch,
  applyLinuxAppServerConversationHydrationPatch,
  applyLinuxCompletedItemRecoveryPatch,
  applyLinuxRemoteTerminalStatusRecoveryPatch,
  applyLinuxAppServerFeatureEnablementPatch,
  applyAutomationUpdateEagerToolPatch,
  applyLinuxAppSunsetPatch,
  applyLinuxBrowserUseAvailabilityPatch,
  applyLinuxBrowserUseExternalAvailabilityPatch,
  applyLinuxBrowserUseNonLocalNavigationPatch,
  applyLinuxChatSearchHydrationPatch,
  applyLinuxConfigWriteVersionConflictPatch,
  applyLinuxFastModeModelGuardPatch,
  applyLinuxI18nGatePatch,
  applyLinuxOpaqueWindowsDefaultPatch,
  applyLinuxProfileSettingsMenuPatch,
  applyLinuxSafeMonospaceFontStackPatch,
  applyLinuxStatusSummaryIntrinsicWidthPatch,
  applyLinuxSkillsListDedupePatch,
  applyLinuxThreadSidePanelNativeTooltipPatch,
  applyLinuxTooltipWindowControlsCollisionPatch,
  applyLinuxWindowControlsSafeAreaPatch,
  applySubagentNicknameMetadataPatch,
} = require("./patches/impl/webview/index.js");
const {
  findCodexRequestWebviewAsset,
  patchAssetFiles,
} = require("./patches/lib/assets.js");

const mainBundlePrefix =
  "let n=require(`electron`),i=require(`node:path`),o=require(`node:fs`);";
const workerBundlePrefix =
  "let i=require(`node:path`),o=require(`node:fs`);";
const fileManagerBundle =
  "var lu=jl({id:`fileManager`,label:`Finder`,icon:`apps/finder.png`,kind:`fileManager`,darwin:{detect:()=>`open`,args:e=>il(e)},win32:{label:`File Explorer`,icon:`apps/file-explorer.png`,detect:uu,args:e=>il(e),open:async({path:e})=>du(e)}});function uu(){}";
const terminalEnvBundle =
  "var Q0=`xterm-256color`;var t={ $r(e){return e} };var Backend=class{isLocalTerminalSession(e){return e?.type===`local`}async getWorktreeShellEnvironmentForCwd(e){return null}async buildTerminalEnv(e,n,r){let i={...process.env};if(n!=null&&(i.CODEX_APP_TITLE=n),this.isLocalTerminalSession(r)){let t=await this.getWorktreeShellEnvironmentForCwd(e);if(t!=null){for(let e of t.exclude)delete i[e];Object.assign(i,t.set)}}return process.platform!==`win32`&&(i.TERM=Q0,delete i.TERMINFO,delete i.TERMINFO_DIRS),t.$r(i)}};";
const alreadyOpaqueBackgroundBundle =
  "process.platform===`linux`?{backgroundColor:e?t:n,backgroundMaterial:null}:{backgroundColor:r,backgroundMaterial:null}";
const opaqueBackgroundBundleWithDriftingGw =
  "var cM=`#00000000`,lM=`#000000`,uM=`#f9f9f9`;function OM(e){return e===`avatarOverlay`||e===`browserCommentPopup`}function jM({platform:e,appearance:t,opaqueWindowsEnabled:n,prefersDarkColors:r}){return e===`win32`&&!OM(t)?n?{backgroundColor:r?lM:uM,backgroundMaterial:`none`}:{backgroundColor:cM,backgroundMaterial:`mica`}:{backgroundColor:cM,backgroundMaterial:null}}function gw(e){return e.page==null?e.snapshot.url:mw(e.page)}";
const currentOpaqueBackgroundBundle =
  "var QK=`#00000000`,$K=`#000000`,eq=`#f9f9f9`;function vq(e){return e===`avatarOverlay`||e===`browserCommentPopup`||e===`globalDictation`||e===`hotkeyWindowHome`||e===`hotkeyWindowThread`}function xq({platform:e,appearance:t,opaqueWindowsEnabled:n,prefersDarkColors:r}){return n&&!vq(t)&&(e===`darwin`||e===`win32`)?{backgroundColor:r?$K:eq,backgroundMaterial:e===`win32`?`none`:null}:e===`win32`&&!vq(t)?{backgroundColor:QK,backgroundMaterial:`mica`}:{backgroundColor:QK,backgroundMaterial:null}}";
const currentOpaqueWindowSurfaceBackgroundBundle =
  "var W4=`#00000000`,G4=`#000000`,K4=`#f9f9f9`;function g3(e){return e===`avatarOverlay`||e===`browserCommentPopup`||e===`globalDictation`||e===`hotkeyWindowHome`||e===`hotkeyWindowThread`||e===`hud`}function v3({appearance:e,opaqueWindowsEnabled:t,platform:n}){return t&&!g3(e)&&(n===`darwin`||n===`win32`)}function S3({platform:e,appearance:t,opaqueWindowSurfaceEnabled:n,prefersDarkColors:r}){return n?{backgroundColor:r?G4:K4,backgroundMaterial:e===`win32`?`none`:null}:e===`win32`&&!g3(t)?{backgroundColor:W4,backgroundMaterial:`mica`}:{backgroundColor:W4,backgroundMaterial:null}}class k3{isOpaqueWindowsEnabled(){return theme?.opaqueWindows===!0}shouldUseOpaqueWindowSurface(e,t,n){return this.shouldAlwaysUseOpaqueWindowSurface(e)}shouldAlwaysUseOpaqueWindowSurface(e){return v3({appearance:e,opaqueWindowsEnabled:this.isOpaqueWindowsEnabled(),platform:process.platform})||!BA()&&!g3(e)}}";
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cryptoHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function applyPatchTwice(patchFn, source, ...args) {
  const patched = patchFn(source, ...args);
  assert.equal(patchFn(patched, ...args), patched);
  return patched;
}

function captureWarns(fn) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(" "));
  };
  try {
    return { value: fn(), warnings };
  } finally {
    console.warn = originalWarn;
  }
}

function automationScheduleBundleFixture() {
  return [
    "var Cc={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:0};",
    "function wc(e){let t=Tc(e.byhour),n=Tc(e.byminute);return t!=null&&n!=null?{hour:t,minute:n}:e.dtstart?{hour:e.dtstart.getHours(),minute:e.dtstart.getMinutes()}:null}",
    "function Tc(e){return Array.isArray(e)?typeof e[0]==`number`?e[0]:null:typeof e==`number`?e:null}",
    "function Ec(e,t){let n=new Date(e),r=new Date(n.getFullYear(),n.getMonth(),n.getDate(),t.hour,t.minute,0,0);return r.getTime()<=e&&r.setDate(r.getDate()+1),r.getTime()}",
    "function Dc(e,t,n){let r=new Date(e),i=r.getDay(),a=n.length>0?n:[0,1,2,3,4,5,6];for(let n=0;n<=7;n+=1){let o=(i+n)%7;if(!a.includes(o))continue;let s=new Date(r.getFullYear(),r.getMonth(),r.getDate()+n,t.hour,t.minute,0,0);if(s.getTime()>e)return s.getTime()}return e}",
    "function Oc(e){return e?(Array.isArray(e)?e:[e]).map(e=>{if(typeof e==`number`)return Ac(e);if(kc(e))return Ac(e.weekday);let t=String(e);return t in Cc?Cc[t]:null}).filter(e=>e!=null):[]}",
    "function kc(e){return typeof e!=`object`||!e||!(`weekday`in e)?!1:typeof e.weekday==`number`}",
    "function Ac(e){return!Number.isInteger(e)||e<0||e>6?null:(e+1)%7}",
    "var jc=`codex_chronicle`;",
  ].join("");
}

function currentAutomationScheduleBundleFixture() {
  return [
    "var K={MINUTELY:1,HOURLY:2,DAILY:3,WEEKLY:4},q=[`SU`,`MO`,`TU`,`WE`,`TH`,`FR`,`SA`],X=Array.from(q),Ht=[`MO`,`TU`,`WE`,`TH`,`FR`],Ut=[`SA`,`SU`],Wt=`09:00`,Gt=`MO`,Kt=new Set([`freq`,`interval`,`dtstart`,`tzid`]),qt=new Set([...Kt,`byweekday`,`byminute`]),Jt=new Set([...qt,`byhour`]);",
    "function Mt(e,t){return t.formatTime(e)}function Y(e,t){return e.length===t.length}function on(e){return e.length>0?e:X}function Sn(){return `minute`}function xn(){return `hour`}function wn({timeLabel:e}){return e}",
    "function Tn(e,t,n){let r=En(e),i=En(t);return r!=null&&i!=null?Mn(r,i):n.dtstart?Mn(n.dtstart.getHours(),n.dtstart.getMinutes()):Wt}function En(e){return Array.isArray(e)?typeof e[0]==`number`?e[0]:null:typeof e==`number`?e:null}",
    "function $(e){let t=yt(e,{forceset:!0,tzid:Nn()??void 0}),n=t.rrules()[0],r=n.options,i=Dn(r.byweekday)??On(e)??X,a=En(r.byminute);return{freq:r.freq,isStandaloneRrule:n.origOptions.dtstart==null&&t.rrules().length===1&&t.rdates().length===0&&t.exrules().length===0&&t.exdates().length===0,hasMultipleTimeValues:Array.isArray(r.byhour)&&r.byhour.length>1||Array.isArray(r.byminute)&&r.byminute.length>1,interval:Math.max(1,Math.round(r.interval??1)),minute:a,origOptions:n.origOptions,rruleText:e,time:Tn(r.byhour,r.byminute,r),weekdays:i}}",
    "function bn(e,t){if(!e||e.hasMultipleTimeValues)return null;let n=on(e.weekdays),r=n.length===q.length;if(e.freq===K.MINUTELY)return Sn({intervalMinutes:e.interval,intl:t,isEveryDay:r,weekdays:n});if(e.freq===K.HOURLY)return xn({intervalHours:e.interval,intl:t,isEveryDay:r,weekdays:n});if(e.freq!==K.DAILY&&e.freq!==K.WEEKLY)return null;let i=Mt(e.time,t);return i?wn({intl:t,isEveryDay:r,timeLabel:i,weekdays:n}):null}",
  ].join("");
}

function currentAutomationScheduleBundleWithDollarIdentifierFixture() {
  return [
    "var TJ={MINUTELY:1,HOURLY:2,DAILY:3,WEEKLY:4},PJ=[`SU`,`MO`,`TU`,`WE`,`TH`,`FR`,`SA`],XJ=`09:00`;",
    "function Flt(e){return e.length>0?e:PJ}function Ylt(){return `minute`}function Jlt(){return `hour`}function Qlt({timeLabel:e}){return e}function xlt(e,t){return t.formatTime(e)}function KJ(e,t){return`${e}:${t}`}",
    "function HJ(e){if(!e)return null;try{let t=DJ(e,{forceset:!0,tzid:iut()??void 0}),n=t.rrules()[0];if(!n)return null;let r=n.options,i=eut(r.byweekday)??tut(e)??PJ,a=WJ(r.byminute);return{freq:r.freq,isStandaloneRrule:n.origOptions.dtstart==null&&t.rrules().length===1&&t.rdates().length===0&&t.exrules().length===0&&t.exdates().length===0,hasMultipleTimeValues:Array.isArray(r.byhour)&&r.byhour.length>1||Array.isArray(r.byminute)&&r.byminute.length>1,interval:Math.max(1,Math.round(r.interval??1)),minute:a,origOptions:n.origOptions,rruleText:e,time:$lt(r.byhour,r.byminute,r),weekdays:i}}catch{return null}}",
    "function qlt(e,t){if(!e||e.hasMultipleTimeValues)return null;let n=Flt(e.weekdays),r=n.length===PJ.length;if(e.freq===TJ.MINUTELY)return Ylt({intervalMinutes:e.interval,intl:t,isEveryDay:r,weekdays:n});if(e.freq===TJ.HOURLY)return Jlt({intervalHours:e.interval,intl:t,isEveryDay:r,weekdays:n});if(e.freq!==TJ.DAILY&&e.freq!==TJ.WEEKLY)return null;let i=xlt(e.time,t);return i?Qlt({intl:t,isEveryDay:r,timeLabel:i,weekdays:n}):null}",
    "function $lt(e,t,n){let r=WJ(e),i=WJ(t);return r!=null&&i!=null?KJ(r,i):n.dtstart?KJ(n.dtstart.getHours(),n.dtstart.getMinutes()):XJ}function WJ(e){return Array.isArray(e)?typeof e[0]==`number`?e[0]:null:typeof e==`number`?e:null}",
  ].join("");
}

function evaluateAutomationSchedule(source, now, options) {
  const context = { now, options, result: null };
  vm.runInNewContext(
    `${source};result=Dc(now,wc(options),Oc(options.byweekday));`,
    context,
  );
  return context.result;
}

test("automation schedule patch honors multiple BYHOUR values", () => {
  const patched = applyPatchTwice(applyAutomationScheduleMultiTimePatch, automationScheduleBundleFixture());
  const options = {
    byhour: [11, 14, 17, 20],
    byminute: [0],
    byweekday: ["MO", "TU", "WE", "TH", "FR"],
    dtstart: new Date(2026, 4, 22, 16, 27, 0, 0),
  };

  assert.match(patched, /function codexLinuxNormalizeRruleNumbers/);
  assert.equal(
    evaluateAutomationSchedule(patched, new Date(2026, 4, 22, 16, 27, 0, 0).getTime(), options),
    new Date(2026, 4, 22, 17, 0, 0, 0).getTime(),
  );
  assert.equal(
    evaluateAutomationSchedule(patched, new Date(2026, 4, 22, 20, 1, 0, 0).getTime(), options),
    new Date(2026, 4, 25, 11, 0, 0, 0).getTime(),
  );
});

test("automation schedule asset patch updates workspace-root bundle", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-automation-schedule-"));
  try {
    const buildDir = path.join(tempRoot, ".vite", "build");
    fs.mkdirSync(buildDir, { recursive: true });
    const bundlePath = path.join(buildDir, "workspace-root-drop-handler-test.js");
    fs.writeFileSync(bundlePath, automationScheduleBundleFixture(), "utf8");

    assert.deepEqual(patchAutomationScheduleAssets(tempRoot), { matched: 1, changed: 1 });
    const patched = fs.readFileSync(bundlePath, "utf8");
    assert.match(patched, /function codexLinuxRruleTimes/);
    assert.deepEqual(patchAutomationScheduleAssets(tempRoot), { matched: 1, changed: 0 });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("automation schedule asset patch updates current webview automation bundle", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-automation-schedule-current-"));
  try {
    const assetsDir = path.join(tempRoot, "webview", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    const bundlePath = path.join(assetsDir, "automation-schedule-test.js");
    fs.writeFileSync(bundlePath, currentAutomationScheduleBundleFixture(), "utf8");

    assert.deepEqual(patchAutomationScheduleAssets(tempRoot), { matched: 1, changed: 1 });
    const patched = fs.readFileSync(bundlePath, "utf8");
    assert.match(patched, /function codexLinuxRruleTimes/);
    assert.match(patched, /timeValues:codexLinuxRruleTimes/);
    assert.match(patched, /codexLinuxAutomationTimeLabel/);
    assert.deepEqual(patchAutomationScheduleAssets(tempRoot), { matched: 1, changed: 0 });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("automation schedule patch handles current dollar-prefixed helper names", () => {
  const patched = applyPatchTwice(
    applyAutomationScheduleMultiTimePatch,
    currentAutomationScheduleBundleWithDollarIdentifierFixture(),
  );

  assert.match(patched, /function codexLinuxRruleTimes/);
  assert.match(patched, /timeValues:codexLinuxRruleTimes/);
  assert.match(patched, /codexLinuxAutomationTimeLabel/);
  assert.doesNotMatch(patched, /if\(!e\|\|e\.hasMultipleTimeValues\)return null/);
});

test("asset patch helpers match every file when passed a global regex", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-asset-global-"));
  try {
    const assetsDir = path.join(tempRoot, "webview", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, "index-a.js"), "a", "utf8");
    fs.writeFileSync(path.join(assetsDir, "index-b.js"), "b", "utf8");

    const result = patchAssetFiles(
      tempRoot,
      /^index-.*\.js$/g,
      (source) => source.toUpperCase(),
      "missing index bundle",
    );

    assert.deepEqual(result, { matched: 2, changed: 2 });
    assert.equal(fs.readFileSync(path.join(assetsDir, "index-a.js"), "utf8"), "A");
    assert.equal(fs.readFileSync(path.join(assetsDir, "index-b.js"), "utf8"), "B");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("Linux safe monospace font stack patch prioritizes Linux mono families", () => {
  const source = "var e=`ui-monospace, \"SFMono-Regular\", Menlo, Consolas, monospace`;export{e as t};";
  const patched = applyPatchTwice(applyLinuxSafeMonospaceFontStackPatch, source);

  assert.match(
    patched,
    /`"Noto Sans Mono", "DejaVu Sans Mono", "Liberation Mono", "Ubuntu Mono", ui-monospace,/,
  );
  assert.doesNotMatch(patched, /var e=`ui-monospace, "SFMono-Regular"/);
});

test("Linux safe monospace font stack patch accepts upstream-safe stacks", () => {
  const source =
    "var e=`DejaVu Sans Mono, ui-monospace, \"SFMono-Regular\", Menlo, Consolas, monospace`;export{e as t};";
  const { value, warnings } = captureWarns(() =>
    applyLinuxSafeMonospaceFontStackPatch(source),
  );

  assert.equal(value, source);
  assert.deepEqual(warnings, []);
});

test("Linux safe monospace font stack patch warns when the unsafe stack drifts", () => {
  const source = "var e=buildFontStack(`ui-monospace`,`monospace`);export{e as t};";
  const { value, warnings } = captureWarns(() =>
    applyLinuxSafeMonospaceFontStackPatch(source),
  );

  assert.equal(value, source);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Could not find Linux monospace font stack insertion point/);
});

test("Linux status summary keeps step and change counts in separate flex space", () => {
  const source = [
    "function ZS(e){let t=(0,QS.c)(9),{children:n}=e,[r,i]=(0,$S.useState)(null);",
    "let c=(0,tC.jsx)(`div`,{ref:o,className:`flex w-max max-w-full min-w-0 items-center gap-2 rounded-3xl border border-token-border/80 bg-token-input-background/70 px-3 py-1.5 text-token-foreground backdrop-blur-sm`,children:n});",
    "return(0,tC.jsx)(Wt.div,{className:`relative z-10 w-fit max-w-[min(100%,var(--thread-content-max-width))] min-w-0 overflow-hidden rounded-3xl`,children:c})}",
  ].join("");
  const patched = applyPatchTwice(
    applyLinuxStatusSummaryIntrinsicWidthPatch,
    source,
  );

  assert.match(
    patched,
    /className:`flex w-max min-w-0 items-center gap-2 rounded-3xl/,
  );
  assert.doesNotMatch(patched, /flex w-max max-w-full min-w-0 items-center/);
  assert.match(
    patched,
    /max-w-\[min\(100%,var\(--thread-content-max-width\)\)\]/,
  );
});

test("Linux status summary layout patch warns when the upstream class drifts", () => {
  const source =
    "className:`flex w-max max-w-full items-center rounded-3xl bg-token-input-background/70 px-3 py-1.5`;className:`max-w-[min(100%,var(--thread-content-max-width))]`";
  const { value, warnings } = captureWarns(() =>
    applyLinuxStatusSummaryIntrinsicWidthPatch(source),
  );

  assert.equal(value, source);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /status summary intrinsic-width insertion point/);
});

test("discovers the status summary layout patch for current thread bundles", () => {
  const descriptor = corePatchDescriptors().find(
    (patch) => patch.id === "linux-status-summary-intrinsic-width",
  );

  assert.ok(descriptor);
  assert.equal(descriptor.phase, "webview-asset");
  assert.equal(descriptor.ciPolicy, "optional");
  assert.equal(
    descriptor.pattern.test(
      "app-initial~app-main~onboarding-page~hotkey-window-thread-page~editor-diff-page~thread-app-~g4rafana-CxARb6bs.js",
    ),
    true,
  );
  assert.equal(descriptor.pattern.test("composer-fixture.js"), false);
});

test("subagent nickname metadata patch accepts session metadata shape", () => {
  const source = [
    "function j(e){return e}",
    "function B(e){if(e==null||typeof e==`string`)return null;let t=Mi(e);return t==null?null:Ni(t)}",
    "function Mi(e){return`subAgent`in e?e.subAgent:null}",
    "function Ni(e){return typeof e==`string`?Pi():`thread_spawn`in e?{parentThreadId:j(e.thread_spawn.parent_thread_id),depth:e.thread_spawn.depth,agentNickname:e.thread_spawn.agent_nickname,agentRole:e.thread_spawn.agent_role}:Pi()}",
    "function Pi(){return{parentThreadId:null,depth:null,agentNickname:null,agentRole:null}}",
    "function Xl(e){return e==null?null:Zl(e.agentNickname)??Zl(B(e.source)?.agentNickname)}",
    "function Zl(e){if(e==null)return null;let t=e.trim();return t.length===0?null:t}",
  ].join("");
  const patched = applyPatchTwice(applySubagentNicknameMetadataPatch, source);

  assert.match(patched, /`subAgent`in e\?e\.subAgent:`subagent`in e\?e\.subagent:null/);
  assert.match(patched, /Zl\(e\.agentNickname\)\?\?Zl\(e\.agent_nickname\)\?\?Zl\(B\(e\.source\)\?\.agentNickname\)/);

  const sandbox = {
    result: null,
  };
  vm.runInNewContext(
    `${patched};result={top:Xl({agent_nickname:\`Ned\`}),source:Xl({source:{subagent:{thread_spawn:{parent_thread_id:\`parent\`,depth:1,agent_nickname:\`Pepper Potts\`,agent_role:\`worker\`}}}}),role:B({subagent:{thread_spawn:{parent_thread_id:\`parent\`,depth:1,agent_nickname:\`Pepper Potts\`,agent_role:\`worker\`}}}).agentRole};`,
    sandbox,
  );

  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.result)), {
    top: "Ned",
    source: "Pepper Potts",
    role: "worker",
  });
});

test("subagent nickname metadata patch accepts current upstream patched aliases", () => {
  const source = [
    "function P(e){return e}",
    "function jo(e){if(e==null||typeof e==`string`)return null;let t=Mo(e);return t==null?null:No(t)}",
    "function Mo(e){return`subAgent`in e?e.subAgent:`subagent`in e?e.subagent:null}",
    "function No(e){return typeof e==`string`?Po():`thread_spawn`in e?{parentThreadId:P(e.thread_spawn.parent_thread_id),depth:e.thread_spawn.depth,agentNickname:e.thread_spawn.agent_nickname,agentRole:e.thread_spawn.agent_role}:Po()}",
    "function Po(){return{parentThreadId:null,depth:null,agentNickname:null,agentRole:null}}",
    "function Fo(e){return e==null?null:Io(e.agentNickname)??Io(e.agent_nickname)??Io(jo(e.source)?.agentNickname)}",
    "function Io(e){if(e==null)return null;let t=e.trim();return t.length===0?null:t}",
  ].join("");
  const { value, warnings } = captureWarns(() =>
    applySubagentNicknameMetadataPatch(source),
  );

  assert.equal(value, source);
  assert.deepEqual(warnings, []);
});

test("subagent metadata descriptor ignores matching sibling bundles without metadata", () => {
  const descriptor = corePatchDescriptors().find((candidate) =>
    candidate.id === "subagent-nickname-metadata-shape",
  );
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-subagent-metadata-sibling-"));
  try {
    const assetsDir = path.join(tempRoot, "webview", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    const siblingSource = "export const hostConfig={local:!0};";
    const metadataSource = [
      "function j(e){return e}",
      "function B(e){if(e==null||typeof e==`string`)return null;let t=Mi(e);return t==null?null:Ni(t)}",
      "function Mi(e){return`subAgent`in e?e.subAgent:null}",
      "function Ni(e){return typeof e==`string`?Pi():`thread_spawn`in e?{parentThreadId:j(e.thread_spawn.parent_thread_id),depth:e.thread_spawn.depth,agentNickname:e.thread_spawn.agent_nickname,agentRole:e.thread_spawn.agent_role}:Pi()}",
      "function Pi(){return{parentThreadId:null,depth:null,agentNickname:null,agentRole:null}}",
      "function Xl(e){return e==null?null:Zl(e.agentNickname)??Zl(B(e.source)?.agentNickname)}",
      "function Zl(e){if(e==null)return null;let t=e.trim();return t.length===0?null:t}",
    ].join("");
    fs.writeFileSync(path.join(assetsDir, "app-server-manager-signals-test.js"), siblingSource);
    fs.writeFileSync(path.join(assetsDir, "use-host-config-test.js"), metadataSource);

    const { value: result, warnings } = captureWarns(() =>
      patchAssetFiles(tempRoot, descriptor.pattern, descriptor.apply, "missing subagent metadata bundle"),
    );

    assert.deepEqual(result, { matched: 2, changed: 1 });
    assert.deepEqual(warnings, []);
    assert.equal(fs.readFileSync(path.join(assetsDir, "app-server-manager-signals-test.js"), "utf8"), siblingSource);
    assert.match(
      fs.readFileSync(path.join(assetsDir, "use-host-config-test.js"), "utf8"),
      /Zl\(e\.agentNickname\)\?\?Zl\(e\.agent_nickname\)\?\?Zl\(B\(e\.source\)\?\.agentNickname\)/,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("Linux target context parses distro, package, and desktop details", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-linux-target-"));
  try {
    const osReleasePath = path.join(tempRoot, "os-release");
    fs.writeFileSync(
      osReleasePath,
      [
        "ID=ubuntu",
        "ID_LIKE=\"debian\"",
        "VERSION_ID=\"24.04\"",
        "PRETTY_NAME=\"Ubuntu 24.04 LTS\"",
      ].join("\n"),
    );

    const target = detectLinuxTargetContext({
      env: {
        OS_RELEASE_FILE: osReleasePath,
        PATH: "",
        XDG_CURRENT_DESKTOP: "KDE:GNOME",
        XDG_SESSION_TYPE: "wayland",
        WAYLAND_DISPLAY: "wayland-0",
      },
    });

    assert.deepEqual(parseOsRelease(fs.readFileSync(osReleasePath, "utf8")).ID_LIKE, "debian");
    assert.equal(target.distro.id, "ubuntu");
    assert.deepEqual(target.distro.idLike, ["debian"]);
    assert.equal(target.distro.versionMajor, 24);
    assert.equal(target.packageFormat, "deb");
    assert.equal(target.packageManager, "apt");
    assert.equal(target.matchesId("debian"), true);
    assert.equal(target.matchesId(["ubuntu", "fedora"]), true);
    assert.equal(target.packageFormatIs("deb"), true);
    assert.equal(target.desktopMatches("kde"), true);
    assert.equal(target.desktopMatches(["plasma", "gnome"]), true);
    assert.equal(target.versionAtLeast("24.04"), true);
    assert.equal(target.versionAtLeast("24.10"), false);
    assert.equal(target.wayland, true);
    assert.match(linuxTargetSummary(target), /^ubuntu:24\.04\/deb:/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("build info captures DMG hash, features, distro profile, and source revision", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-build-info-"));
  // This test reads features.json from its own featuresRoot, which the
  // file-level CODEX_LINUX_FEATURES_CONFIG pin would otherwise override.
  const pinnedFeaturesConfig = process.env.CODEX_LINUX_FEATURES_CONFIG;
  delete process.env.CODEX_LINUX_FEATURES_CONFIG;
  try {
    const dmgPath = path.join(tempRoot, "ChatGPT.dmg");
    fs.writeFileSync(dmgPath, "fake dmg payload", "utf8");

    const appDir = path.join(tempRoot, "ChatGPT.app");
    fs.mkdirSync(path.join(appDir, "Contents"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "Contents", "Info.plist"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0"><dict>',
        "<key>CFBundleShortVersionString</key><string>1.2.3</string>",
        "</dict></plist>",
      ].join("\n"),
      "utf8",
    );

    const featuresRoot = path.join(tempRoot, "linux-features");
    fs.mkdirSync(featuresRoot, { recursive: true });
    fs.writeFileSync(
      path.join(featuresRoot, "features.json"),
      JSON.stringify({ enabled: ["read-aloud", "open-target-discovery"] }),
      "utf8",
    );

    const info = buildInfo({
      repoDir: tempRoot,
      dmgPath,
      appDir,
      electronVersion: "41.3.0",
      appId: "chatgpt-desktop",
      appDisplayName: "ChatGPT",
      featuresRoot,
      env: {
        CODEX_LINUX_SOURCE_COMMIT: "abcdef1234567890",
        CODEX_LINUX_SOURCE_BRANCH: "main",
        CODEX_LINUX_SOURCE_REMOTE: "https://ghp_secret-token@github.com/EricKrouss/chatgpt-desktop-linux.git",
        CODEX_UPSTREAM_DMG_RESOLVED_SOURCE: "classic",
        CODEX_UPSTREAM_DMG_RESOLVED_SOURCE_NAME: "ChatGPT Classic",
        CODEX_UPSTREAM_DMG_RESOLVED_URL: "https://persistent.oaistatic.com/sidekick/public/ChatGPT.dmg",
        SOURCE_DATE_EPOCH: "1710000000",
      },
      linuxTarget: detectLinuxTargetContext({
        osReleaseFields: {
          ID: "ubuntu",
          ID_LIKE: "debian",
          VERSION_ID: "24.04",
          PRETTY_NAME: "Ubuntu 24.04 LTS",
        },
        env: { PATH: "" },
      }),
    });

    assert.equal(info.generatedAt, new Date(1710000000 * 1000).toISOString());
    assert.equal(info.upstreamDmg.path, undefined);
    assert.equal(info.upstreamDmg.sha256, "e33df8d941faed4fdc3bb688fea70572931e81a6e0c2603b810338177148dfa2");
    assert.equal(info.upstreamDmg.appVersion, "1.2.3");
    assert.equal(info.upstreamDmg.source, "classic");
    assert.equal(info.upstreamDmg.sourceName, "ChatGPT Classic");
    assert.equal(info.upstreamDmg.url, "https://persistent.oaistatic.com/sidekick/public/ChatGPT.dmg");
    assert.equal(info.source.shortCommit, "abcdef123456");
    assert.equal(info.source.remote, "https://github.com/EricKrouss/chatgpt-desktop-linux.git");
    assert.equal(
      info.source.commitUrl,
      "https://github.com/EricKrouss/chatgpt-desktop-linux/commit/abcdef1234567890",
    );
    assert.equal(info.packageProfile.id, "debian-family");
    assert.equal(info.packageProfile.packageManager, "apt");
    assert.deepEqual(info.linuxFeatures.enabled, ["read-aloud", "open-target-discovery"]);
    assert.equal(info.linuxFeatures.configPath, undefined);
  } finally {
    if (pinnedFeaturesConfig != null) {
      process.env.CODEX_LINUX_FEATURES_CONFIG = pinnedFeaturesConfig;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("build info omits custom upstream DMG URLs", () => {
  const info = upstreamDmgSourceInfo({
    CODEX_UPSTREAM_DMG_RESOLVED_SOURCE: "custom",
    CODEX_UPSTREAM_DMG_RESOLVED_SOURCE_NAME: "Custom ChatGPT",
    CODEX_UPSTREAM_DMG_RESOLVED_URL: "https://user:secret@example.com/ChatGPT.dmg?token=topsecret",
  });
  assert.equal(info.source, "custom");
  assert.equal(info.sourceName, "Custom ChatGPT");
  assert.equal(info.url, undefined);
});

test("build info sanitizes staged source metadata from packaged update-builder", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-build-info-staged-source-"));
  try {
    const sourceInfoDir = path.join(tempRoot, ".codex-linux");
    fs.mkdirSync(sourceInfoDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourceInfoDir, "source-info.json"),
      JSON.stringify({
        commit: "0123456789abcdef",
        shortCommit: "0123456789ab",
        branch: "main",
        remote: "https://user:secret@example.com/org/repo.git",
        sourceInfoPath: "/home/builder/codex/.codex-linux/source-info.json",
        provenance: "packaged-update-builder",
      }),
      "utf8",
    );

    const info = sourceInfo(tempRoot, {});
    assert.equal(info.remote, "https://example.com/org/repo.git");
    assert.equal(info.commitUrl, null);
    assert.equal(info.sourceInfoPath, undefined);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("build info derives GitHub commit links from common remote forms", () => {
  assert.equal(
    githubCommitUrl("git@github.com:EricKrouss/chatgpt-desktop-linux.git", "0123456789abcdef"),
    "https://github.com/EricKrouss/chatgpt-desktop-linux/commit/0123456789abcdef",
  );
  assert.equal(
    githubCommitUrl("ssh://git@github.com/EricKrouss/chatgpt-desktop-linux.git", "fedcba9876543210"),
    "https://github.com/EricKrouss/chatgpt-desktop-linux/commit/fedcba9876543210",
  );
  assert.equal(githubCommitUrl("https://example.com/org/repo.git", "0123456789abcdef"), null);
  assert.equal(githubCommitUrl("https://github.com/org/repo.git", "not-a-sha"), null);
});

test("package profile distinguishes Fedora package managers by major version", () => {
  const fedora40 = detectLinuxTargetContext({
    osReleaseFields: { ID: "fedora", VERSION_ID: "40", PRETTY_NAME: "Fedora Linux 40" },
    env: { PATH: "" },
    atomic: false,
  });
  const fedora41 = detectLinuxTargetContext({
    osReleaseFields: { ID: "fedora", VERSION_ID: "41", PRETTY_NAME: "Fedora Linux 41" },
    env: { PATH: "" },
    atomic: false,
  });

  assert.equal(packageProfile(fedora40).packageManager, "dnf");
  assert.equal(packageProfile(fedora41).packageManager, "dnf5");
});

test("package profile identifies Fedora Atomic hosts that use rpm-ostree", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-fedora-atomic-target-"));
  try {
    const binDir = path.join(tempRoot, "bin");
    const ostreeBootedPath = path.join(tempRoot, "ostree-booted");
    fs.mkdirSync(binDir, { recursive: true });
    for (const command of ["rpm-ostree", "rpmbuild"]) {
      const commandPath = path.join(binDir, command);
      fs.writeFileSync(commandPath, "#!/bin/sh\nexit 0\n", "utf8");
      fs.chmodSync(commandPath, 0o755);
    }
    fs.writeFileSync(ostreeBootedPath, "", "utf8");

    const fedoraAtomic = detectLinuxTargetContext({
      osReleaseFields: {
        ID: "fedora",
        ID_LIKE: "",
        VERSION_ID: "44",
        PRETTY_NAME: "Fedora Linux 44 (KDE Plasma Desktop Edition)",
      },
      env: {
        PATH: binDir,
        OSTREE_BOOTED_FILE: ostreeBootedPath,
      },
    });

    assert.equal(fedoraAtomic.atomic, true);
    assert.equal(fedoraAtomic.packageFormat, "rpm");
    assert.equal(fedoraAtomic.packageManager, "rpm-ostree");
    assert.equal(fedoraAtomic.packageManagerIs("rpm-ostree"), true);
    assert.equal(packageProfile(fedoraAtomic).id, "fedora-atomic");
    assert.equal(packageProfile(fedoraAtomic).packageManager, "rpm-ostree");

    const fedoraInvalidAtomicOverride = detectLinuxTargetContext({
      osReleaseFields: {
        ID: "fedora",
        ID_LIKE: "",
        VERSION_ID: "44",
      },
      env: {
        PATH: binDir,
        CODEX_LINUX_TARGET_ATOMIC: "maybe",
        OSTREE_BOOTED_FILE: ostreeBootedPath,
      },
    });

    assert.equal(fedoraInvalidAtomicOverride.atomic, true);
    assert.equal(fedoraInvalidAtomicOverride.packageManager, "rpm-ostree");

    const fedoraAtomicOverrideOff = detectLinuxTargetContext({
      osReleaseFields: {
        ID: "fedora",
        ID_LIKE: "",
        VERSION_ID: "44",
      },
      env: {
        PATH: binDir,
        CODEX_LINUX_TARGET_ATOMIC: "0",
        OSTREE_BOOTED_FILE: ostreeBootedPath,
      },
    });

    assert.equal(fedoraAtomicOverrideOff.atomic, false);
    assert.equal(fedoraAtomicOverrideOff.packageManager, "unknown");
    assert.equal(packageProfile(fedoraAtomicOverrideOff).id, "fedora-41-plus");

    const fedoraRegular = detectLinuxTargetContext({
      osReleaseFields: {
        ID: "fedora",
        ID_LIKE: "",
        VERSION_ID: "44",
        PRETTY_NAME: "Fedora Linux 44",
      },
      env: {
        PATH: binDir,
        OSTREE_BOOTED_FILE: path.join(tempRoot, "missing-ostree-booted"),
      },
    });

    assert.equal(fedoraRegular.atomic, false);
    assert.equal(fedoraRegular.packageManager, "unknown");
    assert.equal(packageProfile(fedoraRegular).id, "fedora-41-plus");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("auto-discovered core patches can target a specific Linux distro", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-core-patch-root-"));
  try {
    const patchDir = path.join(tempRoot, "gentoo", "sample");
    fs.mkdirSync(patchDir, { recursive: true });
    fs.writeFileSync(
      path.join(patchDir, "patch.js"),
      [
        "\"use strict\";",
        "module.exports = {",
        "  id: \"gentoo-only-sample\",",
        "  phase: \"main-bundle\",",
        "  ciPolicy: \"required-upstream\",",
        "  order: 30000,",
        "  appliesTo: (context) => context.linux.matchesId(\"gentoo\"),",
        "  apply: (source) => source.replace(\"codexLinuxGentooDisabled()\", \"codexLinuxGentooEnabled()\"),",
        "};",
      ].join("\n"),
    );

    const descriptors = discoverCorePatchDescriptors({ root: tempRoot });
    assert.equal(descriptors.length, 1);
    assert.equal(descriptors[0].id, "gentoo-only-sample");

    const gentoo = detectLinuxTargetContext({
      env: {
        CODEX_LINUX_TARGET_ID: "gentoo",
        CODEX_LINUX_TARGET_PACKAGE_FORMAT: "unknown",
        PATH: "",
      },
    });
    const ubuntu = detectLinuxTargetContext({
      env: {
        CODEX_LINUX_TARGET_ID: "ubuntu",
        CODEX_LINUX_TARGET_ID_LIKE: "debian",
        PATH: "",
      },
    });

    assert.match(
      captureWarns(() =>
        patchMainBundleSource("codexLinuxGentooDisabled()", null, {
          corePatchRoot: tempRoot,
          linuxTarget: gentoo,
        }),
      ).value,
      /codexLinuxGentooEnabled/,
    );
    assert.doesNotMatch(
      captureWarns(() =>
        patchMainBundleSource("codexLinuxGentooDisabled()", null, {
          corePatchRoot: tempRoot,
          linuxTarget: ubuntu,
        }),
      ).value,
      /codexLinuxGentooEnabled/,
    );

    const tempApp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-skipped-target-report-"));
    try {
      const buildDir = path.join(tempApp, ".vite", "build");
      fs.mkdirSync(buildDir, { recursive: true });
      fs.writeFileSync(path.join(buildDir, "main.js"), "codexLinuxGentooDisabled()");
      const report = createPatchReport();
      captureWarns(() =>
        patchExtractedApp(tempApp, {
          report,
          corePatchRoot: tempRoot,
          linuxTarget: ubuntu,
        }),
      );
      assert.equal(
        report.patches.find((patch) => patch.name === "gentoo-only-sample")?.status,
        "skipped-target",
      );
      assert.equal(report.linuxTarget.distro.id, "ubuntu");
    } finally {
      fs.rmSync(tempApp, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("patch descriptor normalization rejects duplicate ids", () => {
  assert.throws(
    () => normalizePatchDescriptors([
      { id: "duplicate", apply: (source) => source },
      { id: "duplicate", apply: (source) => source },
    ]),
    /Duplicate patch descriptor id 'duplicate'/,
  );
});

test("default core patch descriptors are grouped and unique", () => {
  const descriptors = corePatchDescriptors();
  const ids = descriptors.map((descriptor) => descriptor.id);
  const expectedIds = [
    "linux-quit-guard",
    "linux-ready-to-show-window-state",
    "linux-explicit-quit-prompt-bypass",
    "linux-explicit-quit-drain-timeout",
    "linux-explicit-tray-quit",
    "linux-explicit-ipc-quit",
    "linux-window-options",
    "linux-about-dialog",
    "linux-native-titlebar",
    "linux-menu",
    "linux-multi-instance-bootstrap-lock",
    "linux-set-icon",
    "linux-resize-repaint",
    "linux-opaque-background",
    "linux-owl-feature-binding-fallback",
    "linux-avatar-overlay-mouse-passthrough",
    "linux-browser-use-availability",
    "linux-browser-use-non-local-navigation",
    "linux-browser-use-external-availability",
    "linux-chat-search-hydration",
    "linux-file-manager",
    "linux-worker-file-manager",
    "linux-terminal-user-path",
    "linux-tray",
    "linux-build-info-tray",
    "linux-single-instance",
    "linux-computer-use-ui-feature",
    "linux-computer-use-plugin-gate",
    "linux-computer-use-native-desktop-apps",
    "linux-chrome-plugin-auto-install",
    "linux-chrome-native-host-runtime",
    "browser-use-node-repl-approval",
    "linux-browser-use-route-liveness",
    "linux-chrome-extension-status",
    "linux-local-app-server-feature-enablement-handler",
    "linux-remote-control-config-preservation",
    "linux-app-updater-menu",
    "linux-tray-close-setting",
    "linux-settings-persistence",
    "linux-launch-actions",
    "linux-hotkey-window-prewarm",
    "linux-git-origins-source-fallback",
    "linux-external-open-env",
    "linux-xdg-documents-dir",
    "linux-projectless-xdg-documents-dir",
    "linux-workspace-root-open-targets",
    "linux-i18n-gate",
    "linux-profile-settings-menu",
    "automation-schedule-multi-time-rrule",
    "automation-update-eager-tool",
    "linux-app-sunset-gate",
    "linux-app-server-feature-enablement",
    "linux-app-server-backfill-wait",
    "linux-app-server-conversation-hydration",
    "linux-completed-item-recovery",
    "linux-remote-terminal-status-recovery",
    "linux-skills-list-dedupe",
    "linux-status-summary-intrinsic-width",
    "linux-config-write-version-conflict",
    "linux-application-menu",
    "opaque-window-default-general-settings",
    "opaque-window-default-webview-index",
    "opaque-window-default-resolved-theme",
    "linux-window-controls-safe-area",
    "linux-tooltip-window-controls-collision",
    "linux-thread-side-panel-native-tooltip",
    "linux-fast-mode-model-guard",
    "linux-safe-monospace-font-stack",
    "subagent-nickname-metadata-shape",
    "local-environment-action-modal-draft",
    "linux-computer-use-ui-availability",
    "linux-computer-use-install-flow",
    "linux-app-updater-bridge",
    "browser-annotation-screenshot",
    "composer-persistent-rate-limit-footer",
    "keybinds-settings",
    "package-desktop-name",
  ];

  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), [...expectedIds].sort());
  assert.ok(descriptors.every((descriptor) => descriptor.sourcePath.includes(`${path.sep}core${path.sep}`)));
  assert.equal(
    descriptors.find((descriptor) => descriptor.id === "package-desktop-name")?.phase,
    "extracted-app:post-webview",
  );
  assert.equal(
    descriptors.find((descriptor) => descriptor.id === "linux-owl-feature-binding-fallback")?.phase,
    "extracted-app:pre-webview",
  );
  assert.match(
    descriptors.find((descriptor) => descriptor.id === "linux-chrome-plugin-auto-install")?.sourcePath,
    /main-process[\\/]browser-integrations[\\/]patch\.js$/,
  );
  assert.equal(
    descriptors.find((descriptor) => descriptor.id === "local-environment-action-modal-draft")?.ciPolicy,
    "optional",
  );
  assert.equal(
    descriptors.find((descriptor) => descriptor.id === "linux-computer-use-native-desktop-apps")?.ciPolicy,
    "opt-in",
  );
  assert.equal(
    descriptors.find((descriptor) => descriptor.id === "linux-terminal-user-path")?.ciPolicy,
    "optional",
  );
  for (const id of [
    "linux-window-options",
    "linux-native-titlebar",
    "linux-opaque-background",
    "linux-avatar-overlay-mouse-passthrough",
    "linux-tray",
  ]) {
    assert.equal(
      descriptors.find((descriptor) => descriptor.id === id)?.ciPolicy,
      "required-upstream",
      `${id} should block upstream builds when it drifts`,
    );
  }
  assert.equal(
    descriptors.find((descriptor) => descriptor.id === "linux-external-open-env")?.ciPolicy,
    "optional",
    "external URL handoff drift should warn without blocking install/rebuild",
  );
  assert.equal(
    descriptors.find((descriptor) => descriptor.id === "linux-workspace-root-open-targets")?.ciPolicy,
    "optional",
    "workspace-root open targets should not block app builds when upstream removes the File Manager insertion point",
  );

  const descriptorOrder = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor.order]));
  assert.ok(
    descriptorOrder.get("linux-native-titlebar") > descriptorOrder.get("linux-opaque-background"),
    "linux-native-titlebar must run after linux-opaque-background so it can reuse the inserted Linux background branch aliases",
  );
});

test("app-server feature enablement descriptor matches current app-main chunks", () => {
  const descriptor = corePatchDescriptors().find(
    (descriptor) => descriptor.id === "linux-app-server-feature-enablement",
  );

  assert.ok(descriptor);
  assert.equal(descriptor.pattern.test("app-main-DxUcMyo0.js"), true);
  assert.equal(
    descriptor.pattern.test("app-initial~app-main~automations-page-BfqUlSo6.js"),
    true,
  );
  assert.equal(descriptor.pattern.test("experimental-feature-visibility-Bvp90zWX.js"), false);
});

test("patch descriptors reject unsupported ciPolicy values", () => {
  assert.throws(
    () =>
      normalizePatchDescriptors([
        {
          id: "unsupported-policy",
          ciPolicy: "required",
          apply: (source) => source,
        },
      ]),
    /unsupported ciPolicy 'required'/,
  );
});

test("opt-in patch descriptors are recognized as non-critical drift", () => {
  const [descriptor] = normalizePatchDescriptors([
    {
      id: "opt-in-policy",
      ciPolicy: "opt-in",
      apply: (source) => source,
    },
  ]);
  assert.equal(descriptor.ciPolicy, "opt-in");

  const report = {
    patches: [
      {
        name: "opt-in-policy",
        status: "skipped-optional",
        ciPolicy: "opt-in",
        reason: "enable gate disabled",
      },
    ],
  };
  assert.deepEqual(criticalFailuresFromReport(report), []);
  assert.deepEqual(optionalDriftFromReport(report), [
    { name: "opt-in-policy", status: "skipped-optional", reason: "enable gate disabled" },
  ]);
});

test("fast-mode guard descriptor follows upstream service-tier bundle names", () => {
  const descriptor = corePatchDescriptors().find((descriptor) =>
    descriptor.id === "linux-fast-mode-model-guard",
  );

  assert.ok(descriptor.pattern.test("use-is-fast-mode-enabled-abc.js"));
  assert.ok(descriptor.pattern.test("read-service-tier-for-request-BJ8QN0Q7.js"));
  assert.ok(descriptor.pattern.test("use-service-tier-settings-DFXPADNF.js"));
  assert.ok(descriptor.pattern.test("app-server-manager-signals-BOGyjFm3.js"));
  assert.equal(descriptor.pattern.test("service-tier-icons-CsNhab5W.js"), false);
});

test("subagent nickname metadata descriptor follows upstream metadata bundle names", () => {
  const descriptor = corePatchDescriptors().find((descriptor) =>
    descriptor.id === "subagent-nickname-metadata-shape",
  );

  assert.ok(descriptor.pattern.test("app-server-manager-signals-BOGyjFm3.js"));
  assert.ok(descriptor.pattern.test("use-host-config-Dpd_LQBD.js"));
  assert.equal(descriptor.pattern.test("thread-context-inputs-D5uMjcUB.js"), false);
});

function trayBundleFixture() {
  return [
    "async function Hw(e){return process.platform!==`win32`&&process.platform!==`darwin`?null:(zw=!0,Lw??Rw??(Rw=(async()=>{let r=await Ww(e.buildFlavor,e.repoRoot),i=new n.Tray(r.defaultIcon);return i})()))}",
    "async function Ww(e,t){if(process.platform===`darwin`){return null}let r=process.platform===`win32`?`.ico`:`.png`,a=Nw(e,process.platform),o=[...n.app.isPackaged?[(0,i.join)(process.resourcesPath,`${a}${r}`)]:[],(0,i.join)(t,`electron`,`src`,`icons`,`${a}${r}`)];for(let e of o){let t=n.nativeImage.createFromPath(e);if(!t.isEmpty())return{defaultIcon:t,chronicleRunningIcon:null}}return{defaultIcon:await n.app.getFileIcon(process.execPath,{size:process.platform===`win32`?`small`:`normal`}),chronicleRunningIcon:null}}",
    "var pb=class{trayMenuThreads={runningThreads:[],unreadThreads:[],pinnedThreads:[],recentThreads:[],usageLimits:[]};constructor(){this.tray={on(){},setContextMenu(){},popUpContextMenu(){}};this.onTrayButtonClick=()=>{};this.tray.on(`click`,()=>{this.onTrayButtonClick()}),this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})}async handleMessage(e){switch(e.type){case`tray-menu-threads-changed`:this.trayMenuThreads=e.trayMenuThreads;return}}openNativeTrayMenu(){this.updateChronicleTrayIcon();let e=n.Menu.buildFromTemplate(this.getNativeTrayMenuItems());e.once(`menu-will-show`,()=>{this.isNativeTrayMenuOpen=!0}),e.once(`menu-will-close`,()=>{this.isNativeTrayMenuOpen=!1,this.handleNativeTrayMenuClosed()}),this.tray.popUpContextMenu(e)}updateChronicleTrayIcon(){}getNativeTrayMenuItems(){return[]}}",
    "v&&k.on(`close`,e=>{this.persistPrimaryWindowBounds(k,f);let t=this.getPrimaryWindows(f).some(e=>e!==k);if(process.platform===`win32`&&!this.isAppQuitting&&this.options.canHideLastLocalWindowToTray?.()===!0&&!t){e.preventDefault(),k.hide();return}if(process.platform===`darwin`&&!this.isAppQuitting&&!t){e.preventDefault(),k.hide()}});",
    "let E=process.platform===`win32`;E&&oe();",
  ].join("");
}

function currentTrayMenuBundleFixture() {
  return [
    "var sW=class{trayMenuThreads={runningThreads:[],unreadThreads:[],pinnedThreads:[],recentThreads:[],usageLimits:[]};constructor(){this.tray={on(){},setContextMenu(){},popUpContextMenu(){}}}getNativeTrayMenuItems(){let{pinnedThreads:e,recentThreads:t,runningThreads:r,unreadThreads:i,usageLimits:a}=this.trayMenuThreads,o=this.nativeIntl.formatMessage({messageId:vc,defaultMessage:yc}),s=this.nativeIntl.formatMessage({messageId:gc,defaultMessage:_c}),c=uW({label:this.nativeIntl.formatMessage({messageId:oc,defaultMessage:sc}),moreLabel:s,threads:r,projectlessLabel:o,onOpenThread:this.onTrayMenuOpenRecentThread}),h=[c].filter(e=>e.length>0).flatMap((e,t)=>t===0?e:[{type:`separator`},...e]);return[...h,...h.length>0?[{type:`separator`}]:[],{label:this.nativeIntl.formatMessage({messageId:nc,defaultMessage:rc}),click:()=>{this.onTrayMenuOpenNewThread()}},{type:`separator`},{label:fW(this.appName),click:()=>{n.app.quit()}}]}};",
  ].join("");
}

function singleInstanceBundleFixture() {
  return [
    "agentRunId:process.env.CODEX_ELECTRON_AGENT_RUN_ID?.trim()||null}});let A=Date.now();await n.app.whenReady();",
    "l(e=>{R.deepLinks.queueProcessArgs(e)||ie()});let ae=",
  ].join("");
}

function explicitQuitBundleFixture() {
  return [
    "var pb=class{getNativeTrayMenuItems(){return[{label:rB(this.appName),click:()=>{n.app.quit()}}]}};",
    "if(o.type===`quit-app`){n.app.quit();return}",
  ].join("");
}

function beforeQuitConfirmationBundleFixture() {
  return [
    "n.app.on(`before-quit`,o=>{let s=BI(),c=t.sr().some(e=>e.status===`ACTIVE`);if(e||i.canQuitWithoutPrompt()||r||!s&&!c){g=!0,a.markAppQuitting();return}let l=n.app.getName();if(n.dialog.showMessageBoxSync({type:`warning`,buttons:[`Quit`,`Cancel`],defaultId:0,cancelId:1,noLink:!0,title:`Quit ${l}?`,message:`Quit ${l}?`,detail:vB({hasInProgressLocalConversation:s,hasEnabledAutomations:c})})!==0){o.preventDefault();return}i.markQuitApproved(),g=!0,a.markAppQuitting()});",
  ].join("");
}

function willQuitDrainBundleFixture() {
  return [
    "n.app.on(`will-quit`,e=>{if(g=!0,!h){if(i.shouldSkipDrainBeforeQuit()){mB({hotkeyWindowLifecycleManager:c,globalDictationLifecycleManager:l,flushAndDisposeContexts:d,disposables:f});return}e.preventDefault(),h=!0,c.dispose(),l.dispose(),Promise.all([u.flush(),p.flush()]).finally(()=>{d(),f.dispose(),n.app.quit()})}});",
  ].join("");
}

function computerUseGateBundleFixture() {
  return [
    "var Qt=`openai-bundled`,$t=`browser-use`,en=`chrome-internal`,tn=`computer-use`,nn=`latex-tectonic`;",
    "var $n=[{forceReload:!0,installWhenMissing:!0,name:$t,isEnabled:({features:e})=>e.browserAgentAvailable,migrate:cn},{name:en,isEnabled:({buildFlavor:e})=>rn(e)},{name:tn,isEnabled:({features:e,platform:t})=>t===`darwin`&&e.computerUse,migrate:wn},{name:nn,isEnabled:()=>!0}];",
  ].join("");
}

function currentPluginGateBundleFixture() {
  return [
    "var lt=`browser-use`,ut=`chrome`,dt=`chrome-internal`,xt=`chrome-dev`,ft=`computer-use`,pt=`latex-tectonic`;",
    "var Kr=[{forceReload:!0,installWhenMissing:!0,name:lt,isAvailable:({features:e})=>e.inAppBrowserUseAllowed,migrate:rr},{forceReload:!0,name:xt,syncInstallStateWithChromeExtension:!0,isAvailable:({buildFlavor:e,env:t,features:n})=>Ar(e,t)&&n.externalBrowserUseAllowed},{forceReload:!0,name:dt,syncInstallStateWithChromeExtension:!0,isAvailable:({buildFlavor:e,env:t,features:n})=>jr(e,t)&&n.externalBrowserUseAllowed},{forceReload:!0,name:ut,syncInstallStateWithChromeExtension:!0,isAvailable:({buildFlavor:e,features:t})=>t.externalBrowserUseAllowed&&$n(e)},{name:ft,isAvailable:({features:e,platform:t})=>t===`darwin`&&e.computerUse,migrate:vr},{forceReload:!0,installWhenMissing:!0,name:ft,isAvailable:({buildFlavor:e,features:n,platform:r})=>t.T.isInternal(e)&&r===`win32`&&n.computerUse},{name:pt,isAvailable:()=>!0}];",
  ].join("");
}

function chromeNativeHostRuntimeBundleFixture() {
  return [
    "let r=require(`node:path`),o=require(`node:fs`);",
    "function Mc({resourcesPath:e,executableName:t}){if(!e)return null;let n=(0,r.join)(e,t);try{return(0,o.statSync)(n).isFile()?n:null}catch{return null}}",
    "function Pc(e){return Mc({resourcesPath:e,executableName:process.platform===`win32`?`node_repl.exe`:`node_repl`})}",
    "function Fc(e){return Mc({resourcesPath:e,executableName:process.platform===`win32`?`node.exe`:`node`})}",
    "function Ic(e){return Mc({resourcesPath:e,executableName:process.platform===`win32`?`codex.exe`:`codex`})}",
    "function Qp(e){let t=Ic(e.resourcesPath)??$p(e.devRuntimeRepoRoot,[`extension`,`bin`,process.platform===`win32`?`codex.exe`:`codex`]),n=Fc(e.resourcesPath)??$p(e.devRuntimeRepoRoot,[`electron`,`bin`,process.platform===`win32`?`node.exe`:`node`]),r=Pc(e.resourcesPath)??$p(e.devRuntimeRepoRoot,[`electron`,`bin`,process.platform===`win32`?`node_repl.exe`:`node_repl`]),i=[t==null?`codex`:null,n==null?`node`:null,r==null?`node_repl`:null].filter(e=>e!=null);if(i.length>0)throw Error(`Missing bundled Electron runtime required to sync Chrome native host resources for ${e.nativeHostName}: ${i.join(`, `)} (resourcesPath: ${e.resourcesPath}).`);if(t==null||n==null||r==null)throw Error(`Missing bundled Electron runtime required to sync Chrome native host resources for ${e.nativeHostName}.`);return{codexCliPath:t,nodePath:n,nodeReplPath:r}}",
    "function $p(e,t){if(e==null)return null;let n=(0,r.join)(e,...t);try{return(0,o.statSync)(n).isFile()?n:null}catch{return null}}",
  ].join("");
}

function currentChromeNativeHostRuntimeBundleFixture() {
  return [
    "let r=require(`node:path`),o=require(`node:fs`);",
    "function Mc({resourcesPath:e,executableName:t}){if(!e)return null;let n=(0,r.join)(e,t);try{return(0,o.statSync)(n).isFile()?n:null}catch{return null}}",
    "function Oj(e){return Mc({resourcesPath:e,executableName:process.platform===`win32`?`node_repl.exe`:`node_repl`})}",
    "function kj(e){return Mc({resourcesPath:e,executableName:process.platform===`win32`?`node.exe`:`node`})}",
    "function Nj(e){return Mc({resourcesPath:e,executableName:process.platform===`win32`?`codex.exe`:`codex`})}",
    "function QL(e){let t=Nj(e.resourcesPath)??$L(e.devRuntimeRepoRoot,[`extension`,`bin`,process.platform===`win32`?`codex.exe`:`codex`]),n=kj(e.resourcesPath),r=Oj(e.resourcesPath),i=[t==null?`codex`:null,n==null?`node`:null,r==null?`node_repl`:null].filter(e=>e!=null);if(i.length>0)throw Error(`Missing bundled Electron runtime required to sync Chrome native host resources for ${e.nativeHostName}: ${i.join(`, `)} (resourcesPath: ${e.resourcesPath}).`);if(t==null||n==null||r==null)throw Error(`Missing bundled Electron runtime required to sync Chrome native host resources for ${e.nativeHostName}.`);return{codexCliPath:t,nodePath:n,nodeModuleDirs:Aj(e.resourcesPath),nodeReplPath:r}}",
    "function $L(e,t){if(e==null)return null;let n=(0,r.join)(e,...t);try{return(0,o.statSync)(n).isFile()?n:null}catch{return null}}",
    "function Aj(e){return []}",
  ].join("");
}

function electron42BrowserUseRuntimeResolverBundleFixture() {
  return [
    "let s=require(`node:path`),l=require(`node:fs`);",
    "function tt({resourcesPath:e}){return e}",
    "function Kn(e){return e===`linux`?`/primary/node`:null}",
    "function Hn({env:e=process.env,isPackaged:n=!0,platform:r=process.platform,repoRoot:i=process.cwd(),resolveCodexPath:a=t.Wn,resolveNodePath:o=t.Gn,resolveNodeReplPath:s=t.Kn,resolvePrimaryRuntimeNodePath:c=Kn,resourcesPath:l}){let u=l??tt({env:e,resourcesPath:process.resourcesPath}),d=c(r),f=Gn({platform:r,rawValue:e.CODEX_CLI_PATH,resolveWindowsAppsPath:a})??Wn({devRelativePathSegments:[`extension`,`bin`,`codex`],isPackaged:n,platform:r,repoRoot:i,resolveBundledPath:a,resourcesPath:u}),p=Wn({devRelativePathSegments:null,isPackaged:n,platform:r,repoRoot:i,resolveBundledPath:o,resourcesPath:u}),m=Gn({platform:r,rawValue:e.CODEX_BROWSER_USE_NODE_PATH,resolveWindowsAppsPath:o})??(p.path==null&&d!=null?{path:d,source:`primary-runtime`}:p),h=Gn({platform:r,rawValue:e.CODEX_NODE_REPL_PATH,resolveWindowsAppsPath:s})??Wn({devRelativePathSegments:null,isPackaged:n,platform:r,repoRoot:i,resolveBundledPath:s,resourcesPath:u});return{codexCliPath:f.path,codexCliPathSource:f.source,nodeModuleDirs:t.Vn(u),nodePath:m.path,nodePathSource:m.source,nodeReplPath:h.path,nodeReplPathSource:h.source,platform:r}}",
    "function Wn(e){return{path:null,source:`missing`}}function Gn({rawValue:e}){return e==null?null:{path:e,source:`env-override`}}",
  ].join("");
}

function currentChromePluginAppServerRuntimeBundleFixture() {
  return [
    "let r=require(`node:path`),o=require(`node:fs`);",
    "async function XB(e){let t=ZB(e),n=NM(e.resourcesPath),r=MM(e.resourcesPath),i=[t==null?`codex`:null,n==null?`node`:null,r==null?`node_repl`:null].filter(e=>e!=null);if(i.length>0)throw Error(`Missing bundled Electron runtime required to sync Chrome native host resources for ${e.nativeHostName}: ${i.join(`, `)} (resourcesPath: ${e.resourcesPath}).`);if(t==null||n==null||r==null)throw Error(`Missing bundled Electron runtime required to sync Chrome native host resources for ${e.nativeHostName}.`);return{codexCliPath:await fz({codexCliPath:t,codexHome:e.codexHome,nativeHostName:e.nativeHostName}),nodePath:n,nodeModuleDirs:PM(e.resourcesPath),nodeReplPath:r}}",
    "function ZB(e){return LM(e.resourcesPath)??QB(e.devRuntimeRepoRoot,[`extension`,`bin`,process.platform===`win32`?`codex.exe`:`codex`])}function NM(e){return null}function MM(e){return null}function PM(e){return []}function QB(e,t){return null}function LM(e){return null}async function fz({codexCliPath:e}){return e}",
  ].join("");
}

function currentChromePluginCodexAppServerRuntimeBundleFixture() {
  return [
    "let r=require(`node:path`),o=require(`node:fs`);",
    "async function VH(e){let t=_U(e);if(t==null)throw Error(`Missing bundled Electron Codex runtime required to sync Chrome plugin app server for ${e.nativeHostName} (resourcesPath: ${e.resourcesPath??`<none>`}).`);return AV({codexCliPath:t,codexHome:e.codexHome,nativeHostName:e.nativeHostName})}",
    "function _U(e){return tM(e.resourcesPath)??vU(e.devRuntimeRepoRoot,[`extension`,`bin`,process.platform===`win32`?`codex.exe`:`codex`])}function vU(e,t){return null}function tM(e){return null}async function AV({codexCliPath:e}){return{codexCliPath:e}}",
  ].join("");
}

function computerUseFeatureBundleFixture() {
  return "function me(e,{env:t=process.env,platform:n=process.platform}={}){return n!==`win32`||t.CODEX_ELECTRON_ENABLE_WINDOWS_COMPUTER_USE!==`1`?e:{...e,computerUse:!0,computerUseNodeRepl:!0}}";
}

function currentComputerUseFeatureBundleFixture() {
  return "function ye(e,{buildFlavor:n=t.D.resolve(),env:r=d.default.env,platform:i=d.default.platform}={}){let a=i===`win32`&&r.CODEX_ELECTRON_ENABLE_WINDOWS_COMPUTER_USE===`1`?{...e,computerUse:!0,computerUseNodeRepl:!0}:e,o=n===t.D.Dev?be(r):null;return o==null?a:{...a,...o}}";
}

function computerUseRendererAvailabilityBundleFixture() {
  return [
    "function hae(e){return e===`macOS`||e===`windows`}",
    "function LS(e){let t=(0,q.c)(10),{hostId:n,featureName:r,defaultEnabled:i}=e,a=i===void 0?!0:i,{data:o,isLoading:s}=N(Wa,n),c;t[0]===o?c=t[1]:(c=o===void 0?[]:o,t[0]=o,t[1]=c);let l=c,u;if(t[2]!==r||t[3]!==l){let e;t[5]===r?e=t[6]:(e=e=>e.name===r,t[5]=r,t[6]=e),u=l.find(e),t[2]=r,t[3]=l,t[4]=u}else u=t[4];let d=u?.enabled??a,f;return t[7]!==s||t[8]!==d?(f={enabled:d,isLoading:s},t[7]=s,t[8]=d,t[9]=f):f=t[9],f}",
    "function RS(e){let t=(0,q.c)(8),{enabled:n,hostId:r,isHostLocal:i}=e,a=n===void 0?!0:n,o=r===void 0?R:r,s=Kn(),{isLoading:c,platform:l}=Hr(),u=Vn(`1506311413`),d;t[0]===o?d=t[1]:(d={featureName:`computer_use`,hostId:o},t[0]=o,t[1]=d);let f=LS(d),p;t[2]===l?p=t[3]:(p=hae(l),t[2]=l,t[3]=p);let m=a&&i&&s===`electron`&&u&&(c||p),h=m&&!c&&f.enabled&&!f.isLoading,g=m&&f.isLoading,_=m&&(c||f.isLoading),v;return t[4]!==h||t[5]!==g||t[6]!==_?(v={available:h,isFetching:g,isLoading:_},t[4]=h,t[5]=g,t[6]=_,t[7]=v):v=t[7],v}",
  ].join("");
}

function chromeExtensionStatusBundleFixture() {
  return [
    "let r=require(`node:os`),i=require(`node:path`),o=require(`node:fs`);",
    "var am=`com.google.Chrome`,om=`/usr/bin/open`,sm=/^[a-p]{32}$/;",
    "function pm(e){if(!sm.test(e))throw Error(`Invalid extension id`);return e}",
    "function cm(e){return`chrome://extensions/?id=${pm(e)}`}",
    "function lm({extensionId:e,homeDir:t=(0,r.homedir)(),localAppDataDir:n=process.env.LOCALAPPDATA,platform:a=process.platform}){let s=pm(e),c=mm({homeDir:t,localAppDataDir:n,platform:a});return c==null||!(0,o.existsSync)(c)?!1:(0,o.readdirSync)(c,{withFileTypes:!0}).some(e=>e.isDirectory()&&(0,o.existsSync)((0,i.join)(c,e.name,`Extensions`,s)))}async function um({extensionId:e,platform:t=process.platform,detectChromeCommand:n=dm,runCommand:r=Hp}){if(t===`darwin`){await r(om,[`-b`,am,cm(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[cm(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}function dm(){return Rp(`google-chrome`)}",
    "function mm({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,i.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,i.join)(t??(0,i.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}",
    "function Rp(e){return e}async function Hp(){}",
  ].join("");
}

function currentChromeExtensionStatusBundleFixture() {
  return [
    "let r=require(`node:os`),i=require(`node:path`),o=require(`node:fs`);",
    "var nm=`com.google.Chrome`,rm=`/usr/bin/open`,im=/^[a-p]{32}$/;",
    "function am(e){return`chrome://extensions/?id=${um(e)}`}",
    "function om({extensionId:e,homeDir:t=(0,r.homedir)(),localAppDataDir:n=process.env.LOCALAPPDATA,platform:a=process.platform}){let s=um(e),c=dm({homeDir:t,localAppDataDir:n,platform:a});return c==null||!(0,o.existsSync)(c)?!1:(0,o.readdirSync)(c,{withFileTypes:!0}).some(e=>e.isDirectory()&&(0,o.existsSync)((0,i.join)(c,e.name,`Extensions`,s)))}async function sm({extensionId:e,platform:t=process.platform,detectChromeCommand:n=cm,runCommand:r=zp}){if(t===`darwin`){await r(rm,[`-b`,nm,am(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[am(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}function cm(){return Fp(`chrome.exe`)}",
    "function lm(){return null}function um(e){let t=e.trim();if(!im.test(t))throw Error(`Invalid Chrome extension id`);return t}function dm({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,i.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,i.join)(t??(0,i.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}",
    "function Fp(e){return e}async function zp(){}",
  ].join("");
}

function currentChromeExtensionStatusAliasCollisionBundleFixture() {
  return [
    "let a=require(`node:os`),t=require(`node:path`),o=require(`node:fs`);",
    "var nm=`com.google.Chrome`,rm=`/usr/bin/open`,im=/^[a-p]{32}$/;",
    "function am(e){return`chrome://extensions/?id=${um(e)}`}",
    "function om({extensionId:e,homeDir:n=(0,a.homedir)(),localAppDataDir:r=process.env.LOCALAPPDATA,platform:a=process.platform}){let s=um(e),c=dm({homeDir:n,localAppDataDir:r,platform:a});return c==null||!(0,o.existsSync)(c)?!1:(0,o.readdirSync)(c,{withFileTypes:!0}).some(e=>e.isDirectory()&&(0,o.existsSync)((0,t.join)(c,e.name,`Extensions`,s)))}async function sm({extensionId:e,platform:t=process.platform,detectChromeCommand:n=cm,runCommand:r=zp}){if(t===`darwin`){await r(rm,[`-b`,nm,am(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[am(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}function cm(){return Fp(`chrome.exe`)}",
    "function lm(){return null}function um(e){let t=e.trim();if(!im.test(t))throw Error(`Invalid Chrome extension id`);return t}function dm({homeDir:e,localAppDataDir:n,platform:r}){return r===`darwin`?(0,t.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):r===`win32`?(0,t.join)(n??(0,t.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}",
    "function Fp(e){return e}async function zp(){}",
  ].join("");
}

function currentLaunchActionBundleFixture() {
  return [
    "const e={gr:e=>({default:e,...e})};let n=require(`electron`);let i=require(`node:path`);i=e.gr(i);let o=require(`node:fs`);o=e.gr(o);let f=require(`node:net`);f=e.gr(f);",
    "async function CN(){let{setSecondInstanceArgsHandler:l}=t.y(),g={reportNonFatal(){}},k=new t.In;k.add(x);let j={globalState:{get(){return true}},repoRoot:`/tmp`,codexHome:`/tmp`},M={hotkeyWindowLifecycleManager:{hide(){},ensureHotkeyWindowController(){}},getPrimaryWindow(){},createFreshLocalWindow(){},ensureHostWindow(){},windowManager:{sendMessageToWindow(){}}},B=`local`,R={desktopNotificationManager:{dismissByNavigationPath(){}},getOrCreateContext(){},localHost:B},z={deepLinks:{queueProcessArgs(){},flushPendingDeepLinks(){}},navigateToRoute(){}};let A=Date.now(),w=()=>{},ae=e=>{e.isMinimized()&&e.restore(),e.show(),e.focus()},le=async()=>{try{M.hotkeyWindowLifecycleManager.hide();let e=M.getPrimaryWindow()??await M.createFreshLocalWindow(`/`);if(e==null)return;ae(e)}catch(e){g.reportNonFatal(e instanceof Error?e:`Failed to open window on second instance`,{kind:`second-instance-open-window-failed`})}};l(e=>{let n=t.t(t.g(e));if(z.deepLinks.queueProcessArgs(e)){n&&le();return}if(n){le();return}le()});let ue=async(e,t)=>{M.hotkeyWindowLifecycleManager.hide();let n=M.getPrimaryWindow(),r=n??await M.createFreshLocalWindow(e);r!=null&&(R.desktopNotificationManager.dismissByNavigationPath(e),n!=null&&t.navigateExistingWindow&&z.navigateToRoute(r,e),ae(r))};let ce=async()=>{};E&&ce();let be=await M.ensureHostWindow(B);be&&ae(be),w(`local window ensured`,A,{hostId:B,localWindowVisible:be?.isVisible()??!1}),A=Date.now(),await z.deepLinks.flushPendingDeepLinks();}",
  ].join("");
}

function currentLaunchActionBundleWithWindowApiDriftFixture() {
  return currentLaunchActionBundleFixture()
    .replaceAll("createFreshLocalWindow", "createFreshWindow")
    .replace("getPrimaryWindow()??await M.createFreshWindow(`/`)", "getPrimaryWindow()??await M.createFreshWindow(`/`)")
    .replace("let n=M.getPrimaryWindow(),r=n??await M.createFreshWindow(e);", "let n=M.getPrimaryWindow(),r=n??await M.createFreshWindow(e);");
}

function settingsPersistenceBundleFixture() {
  return [
    "let i=require(`node:path`),o=require(`node:fs`);",
    "var s=`.codex-global-state.json`;",
    "const h={\"set-global-state\":async({key:a,value:b,origin:c})=>(this.globalState.set(a,b),Promise.resolve())};",
  ].join("");
}

function currentSettingsPersistenceBundleFixture() {
  return [
    "let i=require(`node:path`),o=require(`node:fs`);",
    "var s=`.codex-global-state.json`,c=`config.toml`;",
    "const h={\"set-global-state\":async({key:a,value:b,origin:c})=>(this.setGlobalStateValue(a,b,c),{success:!0})};",
  ].join("");
}

function legacySettingsPersistenceBundleFixture() {
  return [
    "let i=require(`node:path`),o=require(`node:fs`);",
    "var s=`.codex-global-state.json`;function codexLinuxSettingsPath(){let e=process.env.XDG_CONFIG_HOME||process.env.HOME&&i.join(process.env.HOME,`.config`);return e?i.join(e,`codex-desktop`,`settings.json`):null}function codexLinuxReadSettingsFile(){let e=codexLinuxSettingsPath();if(!e||!o.existsSync(e))return{};try{let t=o.readFileSync(e,`utf8`),n=JSON.parse(t);return n&&typeof n===`object`&&!Array.isArray(n)?n:{}}catch(e){return{}}}function codexLinuxPersistSettingsState(e,t){if(process.platform!==`linux`||![`codex-linux-prompt-window-enabled`,`codex-linux-system-tray-enabled`,`codex-linux-warm-start-enabled`].includes(e))return;try{let n=codexLinuxSettingsPath();if(!n)return;let r=codexLinuxReadSettingsFile();t===void 0?delete r[e]:r[e]=t,o.mkdirSync(i.dirname(n),{recursive:!0,mode:448}),o.writeFileSync(n,JSON.stringify(r,null,2)+`\\n`,`utf8`)}catch(e){}}",
    "const h={\"set-global-state\":async({key:a,value:b,origin:c})=>(this.globalState.set(a,b),codexLinuxPersistSettingsState(a,b),Promise.resolve())};",
  ].join("");
}

function runSettingsPersistence(patchedSource, env, key, value) {
  vm.runInNewContext(
    `${patchedSource};codexLinuxPersistSettingsState(${JSON.stringify(key)},${JSON.stringify(value)});`,
    {
      console,
      JSON,
      Promise,
      require,
      process: { env, platform: "linux" },
    },
  );
}

function keybindsIndexBundleFixture() {
  return [
    "var Kge={\"general-settings\":xh,appearance:Pf,\"git-settings\":t1};",
    "var i_e={\"general-settings\":(0,Z.lazy)(()=>s(()=>import(`./general-settings-DsLl9t6Z.js`),[],import.meta.url)),appearance:(0,Z.lazy)(()=>s(()=>import(`./appearance.js`),[],import.meta.url))};",
    "qge=[`general-settings`,`appearance`,`connections`,`git-settings`,`usage`];",
    "Jge=[{key:`app`,heading:H7.appHeading,slugs:[`general-settings`,`appearance`,`connections`,`git-settings`,`usage`]}];",
    "switch(e){case`appearance`:case`git-settings`:case`worktrees`:case`local-environments`:case`data-controls`:case`environments`:return l===`electron`;}",
    "switch(e){case`usage`:k=g;break bb0;case`appearance`:case`general-settings`:case`agent`:case`git-settings`:case`account`:case`data-controls`:case`personalization`:k=!1;break bb0;}",
  ].join("");
}

function settingsSharedBundleFixture() {
  return [
    '"general-settings":{id:`settings.nav.general-settings`,defaultMessage:`General`,description:`Title for general settings section`},appearance:{id:`settings.nav.appearance`,defaultMessage:`Appearance`,description:`Title for appearance settings section`},',
    "function titleForSection(e){switch(e){case`general-settings`:{let e;return t[2]===Symbol.for(`react.memo_cache_sentinel`)?(e=(0,d.jsx)(n,{id:`settings.section.general-settings`,defaultMessage:`General`,description:`Title for general settings section`}),t[2]=e):e=t[2],e}case`appearance`:return (0,d.jsx)(n,{id:`settings.section.appearance`,defaultMessage:`Appearance`,description:`Title for appearance settings section`})}}",
  ].join("");
}

// Same bundle as settingsSharedBundleFixture() but with the minified JSX message
// component bound to `r` instead of `n` (and the memo cache as `o[5]`), mirroring
// the identifiers shipped in Codex 26.601.21317 (settings-shared-BibDzP9i.js).
// The minifier picks these letters arbitrarily, so the patch must not hardcode them.
function settingsSharedBundleWithDriftingJsxAliasFixture() {
  return [
    '"general-settings":{id:`settings.nav.general-settings`,defaultMessage:`General`,description:`Title for general settings section`},appearance:{id:`settings.nav.appearance`,defaultMessage:`Appearance`,description:`Title for appearance settings section`},',
    "function titleForSection(e){switch(e){case`general-settings`:{let e;return o[5]===Symbol.for(`react.memo_cache_sentinel`)?(e=(0,d.jsx)(r,{id:`settings.section.general-settings`,defaultMessage:`General`,description:`Title for general settings section`}),o[5]=e):e=o[5],e}case`appearance`:return (0,d.jsx)(r,{id:`settings.section.appearance`,defaultMessage:`Appearance`,description:`Title for appearance settings section`})}}",
  ].join("");
}

function linuxDesktopRouteBundleFixture() {
  return [
    "var DE={",
    '"read-aloud-settings":(0,$.lazy)(()=>Xr(()=>import(`./general-settings-read.js`),[],import.meta.url)),',
    '"general-settings":(0,$.lazy)(()=>Xr(()=>import(`./general-settings-A.js`),[],import.meta.url)),',
    "profile:(0,$.lazy)(()=>Xr(()=>import(`./profile-A.js`),[],import.meta.url)),",
    '"keyboard-shortcuts":(0,$.lazy)(()=>Xr(()=>import(`./keyboard-shortcuts-settings-A.js`),[],import.meta.url))',
    "};",
  ].join("");
}

function linuxDesktopNavigationBundleFixture() {
  return [
    'var ye={"general-settings":q,profile:ee,"keyboard-shortcuts":ve,appearance:le};',
    "var xe=[`general-settings`,`profile`,`appearance`,`keyboard-shortcuts`];",
    "var Se=[{key:`app`,slugs:[`general-settings`,`profile`,`appearance`]},{key:`connection`,slugs:[`agent`,`keyboard-shortcuts`}]}];",
    "function visible(e){switch(e.slug){case`appearance`:return!0;case`general-settings`:case`agent`:case`personalization`:return!0;case`keyboard-shortcuts`:return!0}}",
    "function loading(H){let W=!1;if(H)bb0:switch(H.slug){case`appearance`:case`general-settings`:case`agent`:case`git-settings`:case`data-controls`:case`personalization`:W=!1;break bb0;case`keyboard-shortcuts`:W=!1;break bb0}return W}",
  ].join("");
}

function createNativeKeyboardShortcutsSettingsFixture() {
  const extractedDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-native-shortcuts-"));
  const assetsDir = path.join(extractedDir, "webview", "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const writeAsset = (name, source = "") => {
    fs.writeFileSync(path.join(assetsDir, name), source, "utf8");
  };

  writeAsset("chunk-A.js", "");
  writeAsset(
    "jsx-runtime-A.js",
    'import{s as s}from"./chunk-A.js";function n(){return{}}function t(){return{jsx(){},jsxs(){},Fragment:"Fragment"}}react.transitional.element;export{n,t};',
  );
  writeAsset(
    "shared-app-A.js",
    'function requestCodex(...args){let[method,request]=args,{params:params,select:select,signal:signal,source:source}=request??{};return rawCodex(method,params,select,signal,source)}async function rawCodex(method,params,select,signal,source){let result=(await transport.post(`vscode://codex/${method}`,JSON.stringify(params),headers(source),signal)).body;return select?select(result):result}export{requestCodex as z};',
  );
  writeAsset("general-settings-A.js", "hotkey-window-hotkey-state");
  writeAsset("toggle-A.js", "export{t};");
  writeAsset(
    "settings-row-A.js",
    "function a(e){let{label:t,description:n,control:r}=e;return null}function s(e){let{label:t,children:n}=e;return null}export{s as n,a as r};",
  );
  writeAsset("settings-content-layout-A.js", "export{n,r,t};");
  writeAsset("settings-group-A.js", "export{n,t};");
  writeAsset("settings-surface-A.js", "export{t};");
  writeAsset(
    "settings-sections-A.js",
    "var e=`general-settings`,t=`mcp-settings`,n=[{slug:e},{slug:`appearance`},{slug:`keyboard-shortcuts`}];",
  );
  writeAsset("settings-shared-A.js", settingsSharedBundleFixture());
  writeAsset("app-main-A.js", linuxDesktopRouteBundleFixture());
  writeAsset("settings-page-A.js", linuxDesktopNavigationBundleFixture());
  writeAsset("keyboard-shortcuts-settings-A.js", "export default function KeyboardShortcutsSettings(){}");

  return { extractedDir, assetsDir };
}

function createModernNativeKeyboardShortcutsSettingsFixture() {
  const extractedDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-modern-native-shortcuts-"));
  const assetsDir = path.join(extractedDir, "webview", "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const writeAsset = (name, source = "") => {
    fs.writeFileSync(path.join(assetsDir, name), source, "utf8");
  };

  writeAsset("rolldown-runtime-A.js", "function n(e){return e}function s(e){return e}export{n,s};");
  writeAsset(
    "shared-runtime-A.js",
    'import{s as s}from"./rolldown-runtime-A.js";function jsxFactory(){return{jsx(){},jsxs(){},Fragment:"Fragment"}}function reactFactory(){return{useState(){},useCallback(){},useEffect(){}}}function memoCache(){}export{jsxFactory as I,memoCache as L,reactFactory as R};',
  );
  writeAsset(
    "setting-storage-A.js",
    'async function requestCodex(...args){let[request]=args,{params:params,source:source}=request;return send("vscode://codex/",params)}export{requestCodex as z};',
  );
  writeAsset("toggle-A.js", "export{t};");
  writeAsset(
    "settings-row-A.js",
    "function a(e){let{label:t,description:n,control:r}=e;return null}export{a as r};",
  );
  writeAsset("settings-content-layout-A.js", "export{n,r,t};");
  writeAsset("settings-group-A.js", "export{n,t};");
  writeAsset("settings-surface-A.js", "export{t};");
  writeAsset(
    "keyboard-shortcuts-settings-A.js",
    [
      'import{n as __module,s as __toESM}from"./rolldown-runtime-A.js";',
      'import{I as __jsxFactory,L as __memoCache,R as __reactFactory}from"./shared-runtime-A.js";',
      "function KeyboardShortcutsSettings(){let t=(0,React.useState)(null);return (0,$.jsx)(`div`,{children:t})}",
      "var React,$;__module(()=>{React=__toESM(__reactFactory(),1),$=__jsxFactory()})();",
      "slug:`keyboard-shortcuts`;export{KeyboardShortcutsSettings};",
    ].join(""),
  );
  writeAsset(
    "settings-page-A.js",
    [
      'var Zn={"general-settings":(0,Ya.lazy)(()=>Pr(()=>import(`./general-settings-A.js`),[],import.meta.url)),"keyboard-shortcuts":(0,Ya.lazy)(()=>Pr(()=>import(`./keyboard-shortcuts-settings-A.js`),[],import.meta.url))};',
      'var Hn={"general-settings":wt,"keyboard-shortcuts":xn};',
      "var Wn=[`general-settings`,`profile`,`keyboard-shortcuts`];",
      "var Qn=[{key:`app`,slugs:[`general-settings`,`profile`,`keyboard-shortcuts`]}];",
      "function visible(e){switch(e.slug){case`general-settings`:case`agent`:case`personalization`:return!0;case`keyboard-shortcuts`:return!0}}",
      "function loading(H){let W=!1;if(H)bb0:switch(H.slug){case`appearance`:case`general-settings`:case`agent`:case`git-settings`:case`data-controls`:case`personalization`:W=!1;break bb0;case`keyboard-shortcuts`:W=!1;break bb0}return W}",
    ].join(""),
  );
  writeAsset(
    "app-initial~app-main~page~remote-conversation-page~new-thread-panel-page~settings-page~shared-A.js",
    settingsSharedBundleFixture(),
  );
  writeAsset(
    "app-initial~app-main~remote-conversation-page~settings-page~hotkey-window-thread-page~mcp-s-A.js",
    [
      "var c,l=e((()=>{c=`general-settings.import.profile.keyboard-shortcuts.codex-micro.appshots.appearance.pets.agent.git-settings.data-controls.cloud-settings.cloud-environments.code-review.personalization.usage.browser-use.computer-use.local-environments.worktrees.environments.mcp-settings.hooks-settings.connections.plugins-settings.skills-settings`.split(`.`)})),u,d,f,p=e((()=>{",
      "l(),u=`general-settings`,d=function(e){return e.String=`string`,e.Array=`array`,e.Record=`record`,e}({}),",
      "f=[{slug:`general-settings`},{slug:`import`},{slug:`profile`},{slug:`appearance`},{slug:`pets`},{slug:`appshots`},{slug:`git-settings`},{slug:`connections`},{slug:`cloud-settings`},{slug:`cloud-environments`},{slug:`code-review`},{slug:`local-environments`},{slug:`worktrees`},{slug:`agent`},{slug:`personalization`},{slug:`keyboard-shortcuts`},{slug:`usage`},{slug:`browser-use`},{slug:`computer-use`},{slug:`mcp-settings`},{slug:`hooks-settings`},{slug:`plugins-settings`},{slug:`skills-settings`},{slug:`data-controls`}]",
      "}));",
    ].join(""),
  );

  return { extractedDir, assetsDir };
}

// Mirrors Codex 26.623.42026, where the lazy settings route map was hoisted out of
// `settings-page-*.js` into a hashed `app-initial~app-main~*.js` concatenation chunk
// (assigned as a bare `X={...}` inside an IIFE body, no `var` keyword). The
// `settings-page-*.js` bundle then carries only the icon map, nav order, slug
// groups, and visibility/loading switches. This is the layout that rendered the
// Linux desktop nav entry with the page component injected as its icon.
function createSplitRouteNativeKeyboardShortcutsSettingsFixture({
  routeChunkName = "app-initial~app-main~automations-page-A.js",
} = {}) {
  const extractedDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-split-route-shortcuts-"));
  const assetsDir = path.join(extractedDir, "webview", "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const writeAsset = (name, source = "") => {
    fs.writeFileSync(path.join(assetsDir, name), source, "utf8");
  };

  writeAsset("rolldown-runtime-A.js", "function n(e){return e}function s(e){return e}export{n,s};");
  writeAsset(
    "shared-runtime-A.js",
    'import{s as s}from"./rolldown-runtime-A.js";function jsxFactory(){return{jsx(){},jsxs(){},Fragment:"Fragment"}}function reactFactory(){return{useState(){},useCallback(){},useEffect(){}}}function memoCache(){}export{jsxFactory as I,memoCache as L,reactFactory as R};',
  );
  writeAsset(
    "setting-storage-A.js",
    'async function requestCodex(...args){let[request]=args,{params:params,source:source}=request;return send("vscode://codex/",params)}export{requestCodex as z};',
  );
  writeAsset("toggle-A.js", "export{t};");
  writeAsset(
    "settings-row-A.js",
    "function a(e){let{label:t,description:n,control:r}=e;return null}export{a as r};",
  );
  writeAsset("settings-content-layout-A.js", "export{n,r,t};");
  writeAsset("settings-group-A.js", "export{n,t};");
  writeAsset("settings-surface-A.js", "export{t};");
  writeAsset(
    "keyboard-shortcuts-settings-A.js",
    [
      'import{n as __module,s as __toESM}from"./rolldown-runtime-A.js";',
      'import{I as __jsxFactory,L as __memoCache,R as __reactFactory}from"./shared-runtime-A.js";',
      "function KeyboardShortcutsSettings(){let t=(0,React.useState)(null);return (0,$.jsx)(`div`,{children:t})}",
      "var React,$;__module(()=>{React=__toESM(__reactFactory(),1),$=__jsxFactory()})();",
      "slug:`keyboard-shortcuts`;export{KeyboardShortcutsSettings};",
    ].join(""),
  );
  // The icon/navigation bundle: no lazy route map lives here, only the slug -> icon
  // component map plus the order, group, visibility, and loading metadata.
  writeAsset(
    "settings-page-A.js",
    [
      'var Hn={"general-settings":wt,"keyboard-shortcuts":xn};',
      "var Wn=[`general-settings`,`profile`,`keyboard-shortcuts`];",
      "var Qn=[{key:`app`,slugs:[`general-settings`,`profile`,`keyboard-shortcuts`]}];",
      "function visible(e){switch(e.slug){case`general-settings`:case`agent`:case`personalization`:return!0;case`keyboard-shortcuts`:return!0}}",
      "function loading(H){let W=!1;if(H)bb0:switch(H.slug){case`appearance`:case`general-settings`:case`agent`:case`git-settings`:case`data-controls`:case`personalization`:W=!1;break bb0;case`keyboard-shortcuts`:W=!1;break bb0}return W}",
    ].join(""),
  );
  // The hoisted lazy route map, assigned as a bare `FW={...}` inside an IIFE body.
  writeAsset(
    routeChunkName,
    [
      "var Bn,Ya,Pr,FW,Xn=e((()=>{Bn=s(),Ya=t(f(),1),Pr=o(),",
      'FW={"general-settings":(0,Ya.lazy)(()=>Pr(()=>import(`./general-settings-A.js`).then(e=>({default:e.GeneralSettings})),__vite__mapDeps([1,2]))),',
      '"keyboard-shortcuts":(0,Ya.lazy)(()=>Pr(()=>import(`./keyboard-shortcuts-settings-A.js`).then(e=>({default:e.KeyboardShortcutsSettings})),__vite__mapDeps([3])))}',
      "}));",
    ].join(""),
  );
  writeAsset(
    "app-initial~app-main~page~remote-conversation-page~new-thread-panel-page~settings-page~shared-A.js",
    settingsSharedBundleFixture(),
  );
  writeAsset(
    "app-initial~app-main~remote-conversation-page~settings-page~hotkey-window-thread-page~mcp-s-A.js",
    [
      "var c,l=e((()=>{c=`general-settings.import.profile.keyboard-shortcuts.codex-micro.appshots.appearance.pets.agent.git-settings.data-controls.cloud-settings.cloud-environments.code-review.personalization.usage.browser-use.computer-use.local-environments.worktrees.environments.mcp-settings.hooks-settings.connections.plugins-settings.skills-settings`.split(`.`)})),u,d,f,p=e((()=>{",
      "l(),u=`general-settings`,d=function(e){return e.String=`string`,e.Array=`array`,e.Record=`record`,e}({}),",
      "f=[{slug:`general-settings`},{slug:`import`},{slug:`profile`},{slug:`appearance`},{slug:`pets`},{slug:`appshots`},{slug:`git-settings`},{slug:`connections`},{slug:`cloud-settings`},{slug:`cloud-environments`},{slug:`code-review`},{slug:`local-environments`},{slug:`worktrees`},{slug:`agent`},{slug:`personalization`},{slug:`keyboard-shortcuts`},{slug:`usage`},{slug:`browser-use`},{slug:`computer-use`},{slug:`mcp-settings`},{slug:`hooks-settings`},{slug:`plugins-settings`},{slug:`skills-settings`},{slug:`data-controls`}]",
      "}));",
    ].join(""),
  );

  return { extractedDir, assetsDir };
}

function appSunsetBundleFixture() {
  return [
    "function IT(){return null}",
    "function LT(e){let t=(0,Z.c)(3),{children:n}=e;if(ms(`2929582856`)){let e;return t[0]===Symbol.for(`react.memo_cache_sentinel`)?(e=(0,$.jsx)(IT,{}),t[0]=e):e=t[0],e}let r;return t[1]===n?r=t[2]:(r=(0,$.jsx)($.Fragment,{children:n}),t[1]=n,t[2]=r),r}",
  ].join("");
}

function appSunsetBundleWithDriftingAliasFixture() {
  return appSunsetBundleFixture().replace("if(ms(`2929582856`)){", "if(xs(`2929582856`)){");
}

function appSunsetBundleWithDriftingGateFixture() {
  return appSunsetBundleFixture().replace("if(ms(`2929582856`)){", "if(ms?.(`2929582856`)){");
}

function appUpdaterBundleFixture() {
  return [
    "let t=require(`electron`),i=require(`node:path`),s=require(`node:fs`),u=require(`node:child_process`);",
    "var ZE=()=>({warning(){},error(){}});",
    "var tD=class{updater=null;isUpdateReady=!1;updateLifecycleState=`idle`;installProgressPercent=null;lastUnavailableReason=null;constructor(e){this.options=e}async initialize(){if(!this.options.enableUpdater){this.lastUnavailableReason=process.platform!==`darwin`&&process.platform!==`win32`?`unsupported platform`:`disabled for build flavor (${this.options.buildFlavor})`;return}try{if(process.platform===`win32`?await this.initializeWindowsUpdater():await this.initializeMacSparkle(),t.ipcMain.handle(`codex_desktop:check-for-updates`,async e=>{this.options.isTrustedIpcEvent(e)&&await this.checkForUpdates()}),this.hasUpdater())return}catch(e){this.lastUnavailableReason=`updater initialization failed`,this.updater=null}}hasUpdater(){return this.updater!=null}getIsUpdateReady(){return this.isUpdateReady}getInstallProgressPercent(){return this.installProgressPercent}getUpdateLifecycleState(){return this.updateLifecycleState}async checkForUpdates(){if(!this.updater)return;try{await this.updater.checkForUpdates()}catch(e){}}async installUpdatesIfAvailable(){if(!this.updater)return;try{this.isUpdateReady&&this.setUpdateLifecycleState(`installing`),await this.updater.installUpdatesIfAvailable()}catch(e){}}getUnavailableReason(){return this.lastUnavailableReason}async initializeWindowsUpdater(){}async initializeMacSparkle(){}setUpdateReady(e){this.isUpdateReady=e}setUpdateLifecycleState(e){this.updateLifecycleState=e}setInstallProgressPercent(e){this.installProgressPercent=e}};",
  ].join("");
}

function currentBootstrapUpdaterBundleFixture() {
  return [
    "let n=require(`electron`),i=require(`node:path`),o=require(`node:fs`),u=require(`node:child_process`);",
    "c({onUpdateReadyChanged:e=>{a.sendMessageToAllRegisteredWindows({type:`app-update-ready-changed`,isUpdateReady:e})}});",
    "var rK={enabled:!1,running:!1,state:`disabled`};",
    "async function iK(){",
    "let{startedAtMs:r,buildFlavor:a,desktopSentry:o,sparkleManager:s,setSparkleBridgeHandlers:c,setSecondInstanceArgsHandler:l}=t.x(),d=t.T.shouldIncludeSparkle(a,process.platform,process.env);",
    "let M=oG({});let ee=pB(),te=()=>{ee.allowQuitTemporarilyForUpdateInstall(),n.app.quit()};",
    "c({onInstallProgressChanged:e=>{E&&M.sendMessageToAllRegisteredWindows({type:`app-update-install-progress-changed`,installProgressPercent:e})},onUpdateReadyChanged:e=>{M.sendMessageToAllRegisteredWindows({type:`app-update-ready-changed`,isUpdateReady:e})},onUpdateLifecycleStateChanged:e=>{M.sendMessageToAllRegisteredWindows({type:`app-update-lifecycle-state-changed`,lifecycleState:e})},onInstallUpdatesRequested:()=>{te()},isTrustedIpcEvent:N});",
    "}",
  ].join("");
}

function currentBootstrapUpdaterBundleWithParametrizedQuitFixture() {
  return [
    "let n=require(`electron`),i=require(`node:path`),o=require(`node:fs`),u=require(`node:child_process`);",
    "c({onUpdateReadyChanged:e=>{a.sendMessageToAllRegisteredWindows({type:`app-update-ready-changed`,isUpdateReady:e})}});",
    "var rK={enabled:!1,running:!1,state:`disabled`};",
    "async function iK(){",
    "let{startedAtMs:r,buildFlavor:a,desktopSentry:o,sparkleManager:s,setSparkleBridgeHandlers:c,setSecondInstanceArgsHandler:l}=t.x(),d=t.T.shouldIncludeSparkle(a,process.platform,process.env);",
    "let M=oG({});let ee=pB(),te=null,ne=e=>{if(e?.quitImmediately===!1){ee.allowQuitTemporarilyForUpdateInstall();return}ee.allowQuitTemporarilyForUpdateInstall(),n.app.quit()};",
    "c({onInstallProgressChanged:e=>{E&&M.sendMessageToAllRegisteredWindows({type:`app-update-install-progress-changed`,installProgressPercent:e})},onUpdateReadyChanged:e=>{M.sendMessageToAllRegisteredWindows({type:`app-update-ready-changed`,isUpdateReady:e})},onUpdateLifecycleStateChanged:e=>{M.sendMessageToAllRegisteredWindows({type:`app-update-lifecycle-state-changed`,lifecycleState:e})},onInstallUpdatesRequested:e=>{ne(e)},isTrustedIpcEvent:N});",
    "}",
  ].join("");
}

function currentBootstrapUpdaterBundleWithAppUpdateStateBroadcastFixture() {
  return [
    "let r=require(`electron`),i=require(`node:path`),o=require(`node:fs`),u=require(`node:child_process`);",
    "var g6={enabled:!1,running:!1,state:`disabled`};",
    "async function v6(){",
    "let{startedAtMs:e,buildFlavor:i,desktopSentry:o,sparkleManager:s,setSparkleBridgeHandlers:c,setSecondInstanceArgsHandler:l}=n.k(),d=n.P.shouldIncludeSparkle(i,process.platform,process.env)||process.platform===`linux`;",
    "let ee=FZ(),P=null,te=e=>{if(e?.quitImmediately===!1){ee.allowQuitTemporarilyForUpdateInstall();return}ee.allowQuitTemporarilyForUpdateInstall(),r.app.quit()};let F=F3({}),oe=iZ({}),se=oe.getWindowContext();",
    "c({onDownloadProgressChanged:()=>{se.broadcastAppUpdateState()},onInstallProgressChanged:()=>{T&&se.broadcastAppUpdateState()},onUpdateReadyChanged:()=>{se.broadcastAppUpdateState()},onUpdateLifecycleStateChanged:()=>{se.broadcastAppUpdateState()},onRelaunchNoticeChanged:()=>{se.broadcastAppUpdateState()},onInstallUpdatesRequested:e=>{te(e)},isTrustedIpcEvent:M});",
    "}",
  ].join("");
}

function avatarOverlayBundleFixture() {
  return [
    "let u=require(`node:child_process`);",
    "var rV=`/avatar-overlay`,zB={width:356,height:320},oV={width:112,height:121},sV={width:276,height:131};",
    "var fV=class{window=null;openingWindowPromise=null;anchor=pV({x:0,y:0,...zB},oV);dragState=null;layout=null;mascotSize=oV;momentumTimer=null;mousePassthroughEnabled=!1;placement=`top-end`;pointerInteractive=!1;rendererReady=!1;traySize=null;",
    "constructor(e,t){this.windowManager=e,this.globalState=t}",
    "isOpen(){let e=this.window;return e!=null&&!e.isDestroyed()&&e.isVisible()}",
    "startDrag(e,{pointerWindowX:t,pointerWindowY:r}){let i=this.window;if(i==null||i.isDestroyed()||i.webContents.id!==e)return;this.cancelMomentum();let a=this.getLayout(i);this.dragState={pointerAnchorX:t-a.mascot.left,pointerAnchorY:r-a.mascot.top,hasMoved:!1,displayBounds:n.screen.getDisplayNearestPoint(n.screen.getCursorScreenPoint()).bounds}}",
    "moveDrag(e){let t=this.window;t==null||t.isDestroyed()||t.webContents.id!==e||this.dragState==null||(this.cancelMomentum(),this.dragState.hasMoved=!0,this.moveDragToCurrentCursor(t))}",
    "endDrag(e){let t=this.window;t==null||t.isDestroyed()||t.webContents.id!==e||(this.dragState?.hasMoved&&this.moveDragToCurrentCursor(t),this.dragState=null,this.reclampWindowToVisibleDisplay({shouldPersist:!0}))}",
    "setElementSize(e,{mascot:t,tray:n}){let r=this.window;r==null||r.isDestroyed()||r.webContents.id!==e||(this.cancelMomentum(),this.anchor={...this.anchor,width:t.width,height:t.height},this.mascotSize=t,this.traySize=n,this.applyLayout(r))}",
    "async createWindow(e){let t=await this.windowManager.createWindow({title:n.app.getName(),width:zB.width,height:zB.height,appearance:`avatarOverlay`,focusable:!1,show:!1,initialRoute:rV,hostId:this.windowManager.getHostIdForWebContents(e)??`local`});return this.window=t,this.rendererReady=this.windowManager.isWebContentsReady(t.webContents.id),this.dragState=null,this.layout=null,this.mascotSize=oV,this.mousePassthroughEnabled=!1,this.placement=`top-end`,this.pointerInteractive=!1,this.traySize=null,t.once(`ready-to-show`,()=>{t.isDestroyed()||!this.rendererReady||(this.showWindow(t),this.applyPointerInteractivityPolicy())}),t.on(`closed`,()=>{this.window===t&&(this.cancelMomentum(),this.window=null,this.dragState=null,this.layout=null,this.rendererReady=!1,this.pointerInteractive=!1,this.mousePassthroughEnabled=!1,this.globalState.set(Te,!1),this.broadcastOpenState())}),t}",
    "applyLayout(e,t=n.screen.getDisplayNearestPoint(hV(this.anchor)).bounds){if(e.isDestroyed())return;let r=UB({anchor:this.anchor,displayBounds:t,mascotSize:this.mascotSize,previousPlacement:this.placement,traySize:this.traySize??sV});this.anchor=r.anchor,this.layout=r,this.placement=r.placement,this.setWindowBounds(e,r.windowBounds),this.sendLayoutToRenderer(e)}getLayout(e){if(this.layout??this.applyLayout(e),this.layout==null)throw Error(`Expected avatar overlay layout`);return this.layout}",
    "showWindow(e){if(e.isDestroyed())return;let t=this.isOpen();e.moveTop(),e.showInactive(),!t&&this.isOpen()&&this.broadcastOpenState()}showWindowIfReady(e){!this.rendererReady||(this.showWindow(e),this.applyPointerInteractivityPolicy())}broadcastOpenState(){this.windowManager.sendMessageToAllRegisteredWindows({type:`avatar-overlay-open-state-changed`,isOpen:this.isOpen()})}",
    "applyPointerInteractivityPolicy(){let e=this.window;if(e==null||e.isDestroyed()){this.mousePassthroughEnabled=!1;return}let t=!this.pointerInteractive;if(this.mousePassthroughEnabled!==t){if(this.mousePassthroughEnabled=t,t){e.setIgnoreMouseEvents(!0,{forward:!0});return}e.setIgnoreMouseEvents(!1),this.refreshCursorAtCurrentMousePosition(e)}}",
    "refreshCursorAtCurrentMousePosition(e){if(e.isDestroyed())return;let t=n.screen.getCursorScreenPoint(),r=e.getContentBounds(),i=t.x-r.x,a=t.y-r.y;i<0||a<0||i>r.width||a>r.height||e.webContents.sendInputEvent({type:`mouseMove`,x:i,y:a,movementX:0,movementY:0})}",
    "};",
  ].join("");
}

function currentAvatarOverlayBundleFixture() {
  return [
    "let a=require(`electron`),f=require(`node:child_process`);",
    "var rV=`/avatar-overlay`,zB={width:356,height:320},oV={width:112,height:121},k2={width:0,height:0},O2={width:276,height:131};",
    "var h2=class{constructor(e,t,n,r){this.cursorSource=e;this.pointerAnchorX=t;this.pointerAnchorY=n;this.displayBounds=r}recordMovementIntent(){this.hasMovementIntent=!0}getCursorPointForSource(){return null}shouldSuppressRendererThrow(){return!1}updateDisplayBounds(e){this.displayBounds=e}};",
    "var fV=class{window=null;rendererReady=!1;layout=null;mascotSize=oV;traySize=null;pointerInteractive=!1;mousePassthroughEnabled=!1;windowStagedForNativePresentation=!1;layoutMode=`native`;compositionHost={setOverlayWindow(){},isNativeMaterialAttached(){return!1},getCursorPosition(){return null}};nativePositionController={clear(){}};",
    "constructor(e,t){this.windowManager=e,this.globalState=t}",
    "isOpen(){let e=this.window;return e!=null&&!e.isDestroyed()&&e.isVisible()&&!this.windowStagedForNativePresentation}",
    "setPointerInteraction(e,t){let n=this.window;n==null||n.isDestroyed()||n.webContents.id!==e||(this.pointerInteractive=t,this.movedWindowPersistTimer??this.applyPointerInteractivityPolicy())}",
    "startDrag(e,t){let n=this.window;if(n==null||n.isDestroyed()||n.webContents.id!==e)return;this.cancelMomentum(),this.suppressNextRendererThrow=!1,this.clearDetachedDisplayRestore();let r=this.getLayout(n);this.nativePositionController.clear();let i=V2(this.compositionHost.getCursorPosition()),o=t.pointerScreenX!=null&&t.pointerScreenY!=null?{x:t.pointerScreenX,y:t.pointerScreenY}:a.screen.getCursorScreenPoint(),s=i??o,c=t.pointerWindowX-r.mascot.left,l=t.pointerWindowY-r.mascot.top;this.dragState=new h2(i==null?`renderer`:`native`,c,l,a.screen.getDisplayNearestPoint(s).bounds)}",
    "moveDrag(e){return e}",
    "endDrag(e,t){let n=this.window;if(n==null||n.isDestroyed()||n.webContents.id!==e)return;let r=this.dragState;if(r?.hasMovementIntent){let e=r.screen.getCursorScreenPoint(),i=r.getCursorPointForSource({native:r.cursorSource===`native`?V2(this.compositionHost.getCursorPosition()):null,renderer:{x:t?.pointerScreenX??e.x,y:t?.pointerScreenY??e.y}});i!=null&&this.moveDragToPointer(n,i)}this.suppressNextRendererThrow=r?.shouldSuppressRendererThrow()??!1,this.dragState=null,this.reclampWindowToVisibleDisplay({shouldPersist:!0})}",
    "setElementSize(e,{isTrayVisible:t,mascot:n,tray:r}){let i=this.window;i==null||i.isDestroyed()||i.webContents.id!==e||(this.cancelMomentum(),this.layoutMode=t==null?`native`:`legacy`,this.mascotSize=n,this.traySize=r,this.applyLatestElementSizes(i),this.stageWindowForNativePresentation(i),this.showWindowIfReady(i))}",
    "applyLatestElementSizes(e){this.anchor={...this.anchor,width:this.mascotSize.width,height:this.mascotSize.height},this.applyLayout(e)}",
    "async createWindow(e){let t=await this.windowManager.createWindow({title:a.app.getName(),width:zB.width,height:zB.height,appearance:`avatarOverlay`,focusable:!1,show:!1,initialRoute:rV});return this.window=t,this.compositionHost.setOverlayWindow(t),this.rendererReady=this.windowManager.isWebContentsReady(t.webContents.id),this.clearDetachedDisplayRestore(),this.displayBounds=null,this.displayId=null,this.dragState=null,this.layout=null,this.mascotSize=oV,this.mousePassthroughEnabled=!1,this.traySize=null,t.on(`closed`,()=>{this.window===t&&(this.cancelMomentum(),this.clearMovedWindowPersist(),this.window=null,this.dragState=null,this.layout=null,this.rendererReady=!1,this.pointerInteractive=!1,this.mousePassthroughEnabled=!1,this.compositionHost.setOverlayWindow(null),this.broadcastOpenState())}),t}",
    "applyLayout(e,t=this.getCurrentDisplay(),n=!1,r=!0,i=null){if(e.isDestroyed())return;let a=t.bounds;this.displayId=t.id,this.resolutionKey=H2(a),this.displayBounds=a;let o=UB({anchor:this.anchor,displayBounds:this.layoutMode===`native`?t.workArea:t.bounds,mode:this.layoutMode,mascotSize:this.mascotSize,nativeMaterialAttached:this.compositionHost.isNativeMaterialAttached(),previousPlacement:this.placement,traySize:this.traySize??(this.layoutMode===`native`?k2:O2)});this.anchor=o.anchor,this.layout=o,this.placement=o.placement,this.setWindowBounds(e,o.windowBounds,n,r),this.sendLayoutToRenderer(e,i)}getLayout(e){if(this.layout??this.applyLayout(e),this.layout==null)throw Error(`Expected avatar overlay layout`);return this.layout}",
    "showWindow(e){if(e.isDestroyed())return;let t=this.isOpen();this.windowStagedForNativePresentation&&=(e.setOpacity(1),!1),e.moveTop(),e.showInactive(),!t&&this.isOpen()&&(this.finishPendingPresentation(),this.broadcastOpenState())}showWindowIfReady(e){!this.rendererReady||this.initialPresentationState!==`ready`||(this.showWindow(e),this.applyPointerInteractivityPolicy())}stageWindowForNativePresentation(e){e.isDestroyed()||this.applyPointerInteractivityPolicy()}broadcastOpenState(){this.windowManager.sendMessageToAllRegisteredWindows({type:`avatar-overlay-open-state-changed`,isOpen:this.isOpen()})}",
    "applyPointerInteractivityPolicy(){let e=this.window;if(e==null||e.isDestroyed()){this.mousePassthroughEnabled=!1;return}let t=!this.pointerInteractive;if(this.mousePassthroughEnabled!==t){if(this.mousePassthroughEnabled=t,t){e.setIgnoreMouseEvents(!0,{forward:!0});return}e.setIgnoreMouseEvents(!1),this.refreshCursorAtCurrentMousePosition(e)}}refreshCursorAtCurrentMousePosition(e){let t=a.screen.getCursorScreenPoint()}",
    "function V2(e){return e==null?null:{x:e.pointerScreenX,y:e.pointerScreenY}}function H2(e){return`${e.width}x${e.height}`}",
    "};",
  ].join("");
}

test("adds Linux file manager support without relying on exact minified variable names", () => {
  const source = `${mainBundlePrefix}${fileManagerBundle}`;

  const patched = applyPatchTwice(applyLinuxFileManagerPatch, source);

  assert.match(patched, /linux:\{label:`File Manager`/);
  assert.match(patched, /detect:\(\)=>`linux-file-manager`/);
  assert.match(patched, /n\.shell\.openPath\(__codexOpenTarget\)/);
});

test("adds Linux file manager support to the worker open target registry", () => {
  const source = `${workerBundlePrefix}${fileManagerBundle}`;

  const patched = applyPatchTwice(applyLinuxWorkerFileManagerPatch, source);

  assert.match(patched, /linux:\{label:`File Manager`/);
  assert.match(patched, /detect:\(\)=>`linux-file-manager`/);
  assert.match(patched, /o\.existsSync\(t\)/);
  assert.match(patched, /i\.dirname\(t\)/);
  assert.doesNotMatch(patched, /open:async\(\{path:e\}\)=>\{let [^}]*require\(`node:fs`\)/);
  assert.match(patched, /import\(`electron`\)\)\.shell\.openPath\(t\)/);
});

test("restores the user PATH for Linux local terminal sessions", () => {
  const source = `${mainBundlePrefix}${terminalEnvBundle}`;

  const patched = applyPatchTwice(applyLinuxTerminalUserPathPatch, source);

  assert.match(patched, /function codexLinuxRestoreUserTerminalPath/);
  assert.match(patched, /CODEX_LINUX_USER_PATH/);
  assert.match(
    patched,
    /process\.platform===`linux`&&this\.isLocalTerminalSession\(r\)&&codexLinuxRestoreUserTerminalPath\(i\)/,
  );
  assert.doesNotMatch(patched, /CODEX_LINUX_USER_PATH;n\(i\)/);

  const helperSource = patched.match(
    /function codexLinuxRestoreUserTerminalPath\(e\)\{[\s\S]*?return e\}/,
  )?.[0];
  assert.ok(helperSource);

  const managedRuntime = "/opt/chatgpt-desktop/resources/node-runtime";
  const managedBin = `${managedRuntime}/bin`;
  const runHelper = (terminalPath, processPath = `${managedBin}:/usr/bin:/bin`) => {
    const terminalEnv = {
      PATH: terminalPath,
      CODEX_LINUX_USER_PATH: "/usr/bin:/bin",
    };
    vm.runInNewContext(`${helperSource};codexLinuxRestoreUserTerminalPath(terminalEnv);`, {
      process: {
        env: {
          CODEX_LINUX_USER_PATH: "/usr/bin:/bin",
          CODEX_MANAGED_NODE_RUNTIME_DIR: managedRuntime,
          PATH: processPath,
        },
      },
      terminalEnv,
    });
    return terminalEnv;
  };

  assert.deepEqual(runHelper(`${managedBin}:/usr/bin:/bin`), { PATH: "/usr/bin:/bin" });
  assert.deepEqual(
    runHelper(`/worktree/bin:${managedBin}:/custom/bin`, `${managedBin}:/usr/bin:/bin`),
    { PATH: "/worktree/bin:/usr/bin:/bin:/custom/bin" },
  );
  assert.deepEqual(runHelper("/worktree/bin:/custom/bin"), {
    PATH: "/worktree/bin:/custom/bin",
  });
});

test("patchExtractedApp patches worker file manager support", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-worker-file-manager-"));
  try {
    const buildDir = path.join(tempRoot, ".vite", "build");
    const assetsDir = path.join(tempRoot, "webview", "assets");
    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(buildDir, "main.js"),
      [
        mainBundlePrefix,
        "process.platform===`win32`&&k.removeMenu(),",
        alreadyOpaqueBackgroundBundle,
        fileManagerBundle,
        trayBundleFixture(),
        singleInstanceBundleFixture(),
      ].join(""),
    );
    fs.writeFileSync(path.join(buildDir, "worker.js"), `${workerBundlePrefix}${fileManagerBundle}`);
    fs.writeFileSync(path.join(assetsDir, "app-test.png"), "");

    const report = createPatchReport();
    captureWarns(() => patchExtractedApp(tempRoot, { report }));

    const worker = fs.readFileSync(path.join(buildDir, "worker.js"), "utf8");
    assert.match(worker, /linux:\{label:`File Manager`/);
    assert.match(worker, /o\.existsSync\(t\)/);
    assert.match(worker, /i\.dirname\(t\)/);
    assert.doesNotMatch(worker, /open:async\(\{path:e\}\)=>\{let [^}]*require\(`node:fs`\)/);
    assert.match(worker, /import\(`electron`\)\)\.shell\.openPath\(t\)/);
    assert.equal(
      report.patches.find((patch) => patch.name === "linux-worker-file-manager")?.status,
      "applied",
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("patchExtractedApp reports worker file manager patch drift", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-worker-file-manager-drift-"));
  try {
    const buildDir = path.join(tempRoot, ".vite", "build");
    const assetsDir = path.join(tempRoot, "webview", "assets");
    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(buildDir, "main.js"),
      [
        mainBundlePrefix,
        "process.platform===`win32`&&k.removeMenu(),",
        alreadyOpaqueBackgroundBundle,
        fileManagerBundle,
        trayBundleFixture(),
        singleInstanceBundleFixture(),
      ].join(""),
    );
    fs.writeFileSync(
      path.join(buildDir, "worker.js"),
      "const workerRegistry={target:`other`,note:`id:`fileManager``};",
    );
    fs.writeFileSync(path.join(assetsDir, "app-test.png"), "");

    const report = createPatchReport();
    captureWarns(() => patchExtractedApp(tempRoot, { report }));

    const workerPatch = report.patches.find((patch) => patch.name === "linux-worker-file-manager");
    assert.equal(workerPatch?.status, "skipped-optional");
    assert.equal(workerPatch?.reason, "fileManager target found but patchable block not found");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("uses XDG user documents directory for projectless Codex folders on Linux", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-xdg-documents-"));
  try {
    const configDir = path.join(tempRoot, "config");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "user-dirs.dirs"),
      'XDG_DOCUMENTS_DIR="$HOME/My\\ Documents"\n',
      "utf8",
    );

    const source = [
      "let i={default:require(`node:path`)},o=require(`node:fs`);",
      "function ST(e,t,n){let r=CT(n),i=r.resolve(e),a=r.resolve(t);return n===`win32`?i.toLowerCase()===a.toLowerCase():i===a}",
      "function CT(e){return e===`win32`?i.default.win32:i.default.posix}",
      "function vT({desktopPaths:e,homeDir:t,platform:n}){return ST(t,e.getPath(`home`),n)?e.getPath(`documents`):CT(n).join(t,`Documents`)}",
    ].join("");

    const patched = applyPatchTwice(applyLinuxXdgDocumentsDirPatch, source);
    const context = {
      home: "/home/example",
      process: { env: { XDG_CONFIG_HOME: configDir } },
      require,
      result: null,
    };

    vm.runInNewContext(
      `${patched};result=vT({desktopPaths:{getPath:e=>e===\`home\`?home:e===\`documents\`?home+\`/Documents\`:null},homeDir:home,platform:\`linux\`});`,
      context,
    );

    assert.match(patched, /codexLinuxXdgDocumentsDir/);
    assert.match(patched, /`\$1`/);
    assert.equal(context.result, "/home/example/My Documents");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("uses XDG user documents directory for generated projectless workspaces", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-projectless-xdg-documents-"));
  try {
    const configDir = path.join(tempRoot, "config");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "user-dirs.dirs"),
      'XDG_DOCUMENTS_DIR="$HOME/My\\ Documents"\n',
      "utf8",
    );

    const source =
      "function Mb({homeDirectory:e,path:t}){return t.join(e,`Documents`,`Codex`)}function Lb({homeDirectory:e,path:t}){return Mb({homeDirectory:e,path:t})}function Rb(e){return e}";
    const patched = applyPatchTwice(applyLinuxProjectlessXdgDocumentsDirPatch, source);
    const context = {
      home: "/home/example",
      process: { platform: "linux", env: { XDG_CONFIG_HOME: configDir } },
      require,
      result: null,
    };

    vm.runInNewContext(
      `${patched};result=Mb({homeDirectory:home,path:require(\`node:path\`).posix});`,
      context,
    );

    assert.match(patched, /codexLinuxProjectlessDocumentsDir/);
    assert.match(patched, /`\$1`/);
    assert.equal(context.result, "/home/example/My Documents/Codex");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("projectless documents asset patch updates Vite build bundle", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-projectless-xdg-asset-"));
  try {
    const buildDir = path.join(tempRoot, ".vite", "build");
    fs.mkdirSync(buildDir, { recursive: true });
    const bundlePath = path.join(buildDir, "src-test.js");
    fs.writeFileSync(
      bundlePath,
      "function Mb({homeDirectory:e,path:t}){return t.join(e,`Documents`,`Codex`)}async function Lb(){throw Error(`Projectless thread directory must be a real directory`)}",
      "utf8",
    );

    assert.deepEqual(patchProjectlessDocumentsAssets(tempRoot), { matched: 1, changed: 1 });
    const patched = fs.readFileSync(bundlePath, "utf8");
    assert.match(patched, /function codexLinuxProjectlessDocumentsDir/);
    assert.deepEqual(patchProjectlessDocumentsAssets(tempRoot), { matched: 1, changed: 0 });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("projectless documents descriptor surfaces resolver drift as skipped optional", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-projectless-xdg-drift-"));
  try {
    const buildDir = path.join(tempRoot, ".vite", "build");
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, "main.js"), mainBundlePrefix, "utf8");
    fs.writeFileSync(
      path.join(buildDir, "src-test.js"),
      "function Mb({homeDirectory:e,path:t}){return t.resolve(e,`Documents`,`Codex`)}async function Lb(){throw Error(`Projectless thread directory must be a real directory`)}",
      "utf8",
    );

    const report = createPatchReport();
    captureWarns(() => patchExtractedApp(tempRoot, { report }));

    const patch = report.patches.find((patch) =>
      patch.name === "linux-projectless-xdg-documents-dir",
    );
    assert.equal(patch.status, "skipped-optional");
    assert.match(patch.reason, /projectless documents directory resolver/);
    assert.ok(
      patch.warnings.some((warning) =>
        warning.includes("projectless documents directory resolver"),
      ),
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("preserves user-enabled remote_control config on Linux", () => {
  const source = [
    "async function mV({codexHome:e,hostConfig:n,logger:r=t.Jr()}){if(n.kind===`local`)try{await hV(i.default.join(e??t.Rr({hostConfig:n,preferWsl:t.Kr(n)}),pV))&&r.info(`Removed remote_control from config before app-server start`)}catch(e){r.warning(`Failed to remove remote_control before app-server start`,{safe:{},sensitive:{error:e}})}}",
    "async function vV({codexHome:e,hostConfig:n,logger:r=t.Jr()}){if(n.kind===`local`)try{await yV(i.default.join(e??t.Rr({hostConfig:n,preferWsl:t.Kr(n)}),_V))&&r.info(`Removed remote_control from config before app-server start`)}catch(e){r.warning(`Failed to remove remote_control before app-server start`,{safe:{},sensitive:{error:e}})}}",
  ].join("");

  const patched = applyPatchTwice(applyLinuxRemoteControlConfigPreservationPatch, source);

  assert.match(patched, /mV\(\{codexHome:e,hostConfig:n,logger:r=t\.Jr\(\)\}\)\{if\(n\.kind===`local`&&process\.platform!==`linux`\)try\{/);
  assert.match(patched, /vV\(\{codexHome:e,hostConfig:n,logger:r=t\.Jr\(\)\}\)\{if\(n\.kind===`local`&&process\.platform!==`linux`\)try\{/);
  assert.equal((patched.match(/process\.platform!==`linux`/g) ?? []).length, 2);
});

test("warns when upstream still strips remote_control but the guard shape drifts", () => {
  const source =
    "async()=>{await yV(path)&&logger.info(`Removed remote_control from config before app-server start`)}";

  const { value, warnings } = captureWarns(() =>
    applyLinuxRemoteControlConfigPreservationPatch(source),
  );

  assert.equal(value, source);
  assert.match(warnings.join("\n"), /remote-control config stripper guard/);
});

test("registers local app-server feature enablement in internal and Electron handlers", () => {
  const source = [
    "function create(){let f=new t.wn(this.options.messageChannel,{sharedObjectRepository:this.sharedObjectRepository});",
    "return f.registerInternalServerRequestHandler({methods:[`item/commandExecution/requestApproval`,`mcpServer/elicitation/request`],handler:t=>(this.messageHandler.revealWindowsReviewRequest(e,t),null)}),",
    "f.registerInternalServerRequestHandler({methods:[`attestation/generate`],handler:be({bundleIdentifier:n.k(this.options.buildFlavor),resourcesPath:l})}),f}",
    "var oN=class{handlers={\"set-vs-context\":async()=>{throw new rN},\"linux-read-aloud\":async(e)=>codexLinuxReadAloudHandle(e)};",
    "handleVSCodeRequest(e,n,r,i,a){let o=n,s=this.handlers[o];if(typeof s!=`function`)throw Error(`${n} not implemented in the current Electron process. Restart Codex to load the latest Electron handlers.`);return s({...r,origin:e,signal:a})}}",
  ].join("");

  const patched = applyPatchTwice(
    applyLinuxLocalAppServerFeatureEnablementHandlerPatch,
    source,
  );

  assert.match(patched, /methods:\[`set-local-app-server-feature-enablement`\]/);
  assert.match(patched, /"set-local-app-server-feature-enablement":async/);
  assert.match(patched, /local_app_server_feature_enablement/);
  assert.match(patched, /local_remote_control_enabled/);
  assert.match(patched, /`mentions_v2`/);
  assert.match(patched, /`tool_search`/);
  assert.match(patched, /enablement/);
  assert.equal(
    (patched.match(/set-local-app-server-feature-enablement/g) ?? []).length,
    2,
  );
});

test("adds the Linux quit guard when electron/path/fs requires are split across statements", () => {
  const source =
    "const e={gr:e=>({default:e,...e})};let n=require(`electron`);let i=require(`node:path`);i=e.gr(i);let o=require(`node:fs`);o=e.gr(o);";

  const patched = applyPatchTwice(applyLinuxQuitGuardPatch, source);

  assert.match(patched, /let codexLinuxQuitInProgress=!1/);
  assert.match(patched, /codexLinuxExplicitQuitApproved=!1/);
  assert.match(patched, /codexLinuxMarkQuitInProgress=\(\)=>\{codexLinuxQuitInProgress=!0\}/);
  assert.match(patched, /codexLinuxPrepareForExplicitQuit=\(\)=>\{codexLinuxExplicitQuitApproved=!0,codexLinuxMarkQuitInProgress\(\)\}/);
  assert.match(patched, /codexLinuxShouldBypassQuitPrompt=\(\)=>codexLinuxExplicitQuitApproved===!0/);
  assert.match(patched, /codexLinuxIsQuitInProgress=\(\)=>codexLinuxQuitInProgress===!0/);
});

test("adds the Linux quit guard for the current wrapped electron/path/fs prelude", () => {
  const source =
    "function codexLinuxPatchExternalOpen(e){return e}let n=codexLinuxPatchExternalOpen(require(`electron`)),i=require(`node:path`),a=require(`node:fs`);";

  const patched = applyPatchTwice(applyLinuxQuitGuardPatch, source);

  assert.match(patched, /let n=codexLinuxPatchExternalOpen\(require\(`electron`\)\),i=require\(`node:path`\),a=require\(`node:fs`\);let codexLinuxQuitInProgress=!1/);
  assert.match(patched, /codexLinuxExplicitQuitApproved=!1/);
  assert.match(patched, /codexLinuxPrepareForExplicitQuit=\(\)=>\{codexLinuxExplicitQuitApproved=!0,codexLinuxMarkQuitInProgress\(\)\}/);
  assert.equal((patched.match(/codexLinuxQuitInProgress=!1/g) ?? []).length, 1);
});

test("adds the Linux quit guard for the current interleaved bundler prelude", () => {
  const source =
    "let a=codexLinuxPatchExternalOpen(require(`electron`));a=e.o(a);let o=require(`node:os`);o=e.o(o);let s=require(`node:path`);s=e.o(s);let c=require(`node:util`),l=require(`node:crypto`),u=require(`node:fs`);u=e.o(u);let d=require(`node:fs/promises`);";

  const patched = applyPatchTwice(applyLinuxQuitGuardPatch, source);

  assert.match(patched, /let d=require\(`node:fs\/promises`\);/);
  assert.match(patched, /u=e\.o\(u\);let codexLinuxQuitInProgress=!1/);
  assert.match(patched, /codexLinuxExplicitQuitApproved=!1/);
  assert.match(patched, /codexLinuxPrepareForExplicitQuit=\(\)=>\{codexLinuxExplicitQuitApproved=!0,codexLinuxMarkQuitInProgress\(\)\}/);
  assert.equal((patched.match(/codexLinuxQuitInProgress=!1/g) ?? []).length, 1);
});

test("bypasses the upstream before-quit confirmation after a Linux explicit quit", () => {
  const source = `${mainBundlePrefix}${beforeQuitConfirmationBundleFixture()}`;
  const patched = applyPatchTwice(
    applyLinuxExplicitQuitPromptBypassPatch,
    applyLinuxQuitGuardPatch(source),
  );

  assert.match(
    patched,
    /if\(\(typeof codexLinuxShouldBypassQuitPrompt===`function`&&codexLinuxShouldBypassQuitPrompt\(\)\)\|\|e\|\|i\.canQuitWithoutPrompt\(\)\|\|r\|\|!s&&!c\)\{process\.platform===`linux`&&typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),g=!0,a\.markAppQuitting\(\);return\}/,
  );
  assert.match(
    patched,
    /process\.platform===`linux`&&typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),i\.markQuitApproved\(\),g=!0,a\.markAppQuitting\(\)/,
  );
});

test("adds a bounded will-quit drain fallback for Linux explicit quit", () => {
  const source = `${mainBundlePrefix}${willQuitDrainBundleFixture()}`;
  const patched = applyPatchTwice(
    applyLinuxWillQuitDrainTimeoutPatch,
    applyLinuxQuitGuardPatch(source),
  );

  assert.match(patched, /codexLinuxExplicitQuitDrainTimeoutMs=3e3/);
  assert.match(patched, /\(\(\)=>\{let codexLinuxFinalizeQuit=\(\)=>\{d\(\),f\.dispose\(\),n\.app\.quit\(\)\},codexLinuxDrainPromise=Promise\.all\(\[u\.flush\(\),p\.flush\(\)\]\);/);
  assert.match(patched, /if\(process\.platform===`linux`&&\(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress\(\)\)\)\{Promise\.race\(\[codexLinuxDrainPromise,new Promise\(e=>setTimeout\(e,typeof codexLinuxExplicitQuitDrainTimeoutMs===`number`\?codexLinuxExplicitQuitDrainTimeoutMs:3e3\)\)\]\)\.finally\(codexLinuxFinalizeQuit\);return\}/);
  assert.doesNotMatch(patched, /\\`number\\`/);
  assert.match(patched, /codexLinuxDrainPromise\.finally\(codexLinuxFinalizeQuit\)\}\)\(\)/);
  assert.doesNotThrow(() => new Function(patched));
});

test("marks Linux quit-in-progress for the tray quit path", () => {
  const source = `${mainBundlePrefix}${explicitQuitBundleFixture()}`;
  const patched = applyPatchTwice(
    applyLinuxExplicitTrayQuitPatch,
    applyLinuxQuitGuardPatch(source),
  );

  assert.match(
    patched,
    /\{label:rB\(this\.appName\),click:\(\)=>\{typeof codexLinuxPrepareForExplicitQuit===`function`\?codexLinuxPrepareForExplicitQuit\(\):typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),n\.app\.quit\(\)\}\}/,
  );
});

test("marks Linux quit-in-progress for the quit-app IPC path", () => {
  const source = `${mainBundlePrefix}${explicitQuitBundleFixture()}`;
  const patched = applyPatchTwice(
    applyLinuxExplicitIpcQuitPatch,
    applyLinuxQuitGuardPatch(source),
  );

  assert.match(
    patched,
    /if\(o\.type===`quit-app`\)\{typeof codexLinuxPrepareForExplicitQuit===`function`\?codexLinuxPrepareForExplicitQuit\(\):typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),n\.app\.quit\(\);return\}/,
  );
});

test("supports explicit tray quit patching when minified aliases drift", () => {
  const source =
    "let x=require(`electron`);var q=class{getNativeTrayMenuItems(){return[{label:rB(this.appName),click:()=>{x.app.quit()}}]}};if(m.type===`quit-app`){x.app.quit();return}";
  const patched = applyPatchTwice(applyLinuxExplicitTrayQuitPatch, source);

  assert.match(
    patched,
    /\{label:rB\(this\.appName\),click:\(\)=>\{typeof codexLinuxPrepareForExplicitQuit===`function`\?codexLinuxPrepareForExplicitQuit\(\):typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),x\.app\.quit\(\)\}\}/,
  );
});

test("supports explicit tray quit patching when upstream renames the quit label helper", () => {
  const source =
    "let n=require(`electron`);var q=class{getNativeTrayMenuItems(){return[{label:mH(this.appName),click:()=>{n.app.quit()}}]}};function mH(e){let t=n.Menu.buildFromTemplate([{role:`quit`}]);return(Array.isArray(t)?t:t.items)[0]?.label??`Quit ${e}`}";
  const patched = applyPatchTwice(applyLinuxExplicitTrayQuitPatch, source);

  assert.match(
    patched,
    /\{label:mH\(this\.appName\),click:\(\)=>\{typeof codexLinuxPrepareForExplicitQuit===`function`\?codexLinuxPrepareForExplicitQuit\(\):typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),n\.app\.quit\(\)\}\}/,
  );
});

test("supports explicit IPC quit patching when minified aliases drift", () => {
  const source =
    "let x=require(`electron`);var q=class{getNativeTrayMenuItems(){return[{label:rB(this.appName),click:()=>{x.app.quit()}}]}};if(m.type===`quit-app`){x.app.quit();return}";
  const patched = applyPatchTwice(applyLinuxExplicitIpcQuitPatch, source);

  assert.match(
    patched,
    /if\(m\.type===`quit-app`\)\{typeof codexLinuxPrepareForExplicitQuit===`function`\?codexLinuxPrepareForExplicitQuit\(\):typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),x\.app\.quit\(\);return\}/,
  );
});

test("patches remaining explicit quit handlers when another copy is already patched", () => {
  const quitMarkerExpression =
    "typeof codexLinuxPrepareForExplicitQuit===`function`?codexLinuxPrepareForExplicitQuit():typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress(),";
  const patchedTrayQuit = `{label:rB(this.appName),click:()=>{${quitMarkerExpression}n.app.quit()}}`;
  const unpatchedTrayQuit = "{label:rB(this.appName),click:()=>{n.app.quit()}}";
  const patchedIpcQuit = `if(o.type===\`quit-app\`){${quitMarkerExpression}n.app.quit();return}`;
  const unpatchedIpcQuit = "if(o.type===`quit-app`){n.app.quit();return}";

  const patchedTray = applyPatchTwice(
    applyLinuxExplicitTrayQuitPatch,
    `${patchedTrayQuit}function createSecondTray(){return ${unpatchedTrayQuit}}`,
  );
  const patchedIpc = applyPatchTwice(
    applyLinuxExplicitIpcQuitPatch,
    `${patchedIpcQuit}function createSecondIpc(){${unpatchedIpcQuit}}`,
  );

  assert.equal((patchedTray.match(/codexLinuxPrepareForExplicitQuit\(\)/g) ?? []).length, 2);
  assert.match(
    patchedTray,
    /function createSecondTray\(\)\{return \{label:rB\(this\.appName\),click:\(\)=>\{typeof codexLinuxPrepareForExplicitQuit===`function`\?codexLinuxPrepareForExplicitQuit\(\):typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),n\.app\.quit\(\)\}\}\}/,
  );
  assert.equal((patchedIpc.match(/codexLinuxPrepareForExplicitQuit\(\)/g) ?? []).length, 2);
  assert.match(
    patchedIpc,
    /function createSecondIpc\(\)\{if\(o\.type===`quit-app`\)\{typeof codexLinuxPrepareForExplicitQuit===`function`\?codexLinuxPrepareForExplicitQuit\(\):typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress\(\),n\.app\.quit\(\);return\}\}/,
  );
});

test("uses the frameless native ChatGPT titlebar for primary Linux windows", () => {
  const source = [
    "function A2(e){return e===`avatarOverlay`}",
    "function I2({platform:e,appearance:t,opaqueWindowsEnabled:n,prefersDarkColors:r}){return n&&!A2(t)&&(e===`darwin`||e===`win32`)?{backgroundColor:r?a2:o2,backgroundMaterial:e===`win32`?`none`:null}:e===`linux`&&!A2(t)?{backgroundColor:r?a2:o2,backgroundMaterial:null}:{backgroundColor:i2,backgroundMaterial:null}}",
    "function b2(e=1){return{color:i2,symbolColor:a.nativeTheme.shouldUseDarkColors?v2:_2,height:Math.round(g2*e)}}",
    "case`primary`:return n===`darwin`?t?{titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:{vibrancy:`menu`,titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:n===`win32`?{titleBarStyle:`hidden`,titleBarOverlay:b2(r)}:{titleBarStyle:`default`};",
  ].join("");
  const patched = applyPatchTwice(applyLinuxNativeTitlebarPatch, source);

  assert.match(
    patched,
    /function codexLinuxTitleBarOverlay\(e=1\)\{return\{color:a\.nativeTheme\.shouldUseDarkColors\?`#111111`:o2,symbolColor:a\.nativeTheme\.shouldUseDarkColors\?v2:_2,height:Math\.round\(30\*e\)\}\}/,
  );
  assert.match(
    patched,
    /n===`linux`\?\{titleBarStyle:`hidden`,titleBarOverlay:codexLinuxTitleBarOverlay\(r\)\}/,
  );
  assert.doesNotMatch(patched, /n===`win32`\?\{titleBarStyle:`hidden`,titleBarOverlay:b2\(r\)\}:\{titleBarStyle:`default`\}/);
  assert.doesNotMatch(patched, /n===`win32`\|\|n===`linux`\?\{titleBarStyle:`hidden`,titleBarOverlay:b2\(r\)\}/);
});

test("uses a module-scoped Linux native titlebar helper when aliases shadow Electron", () => {
  const source = [
    "function A3(e){return e===`avatarOverlay`}",
    "function I3({platform:e,appearance:t,opaqueWindowsEnabled:n,prefersDarkColors:r}){return n&&!A3(t)&&(e===`darwin`||e===`win32`)?{backgroundColor:r?L4:K4,backgroundMaterial:e===`win32`?`none`:null}:e===`linux`&&!A3(t)?{backgroundColor:r?L4:K4,backgroundMaterial:null}:{backgroundColor:W4,backgroundMaterial:null}}",
    "function o3(e=1){return{color:W4,symbolColor:r.nativeTheme.shouldUseDarkColors?i3:r3,height:Math.round(g3*e)}}",
    "function T3({appearance:e,opaqueWindowSurfaceEnabled:t,platform:n,windowZoom:r=1}){switch(e){case`primary`:return n===`darwin`?t?{titleBarStyle:`hiddenInset`,trafficLightPosition:a3(r)}:{vibrancy:`menu`,titleBarStyle:`hiddenInset`,trafficLightPosition:a3(r)}:n===`win32`?{titleBarStyle:`hidden`,titleBarOverlay:o3(r)}:{titleBarStyle:`default`};}}",
  ].join("");
  const { value, warnings } = captureWarns(() =>
    applyPatchTwice(applyLinuxNativeTitlebarPatch, source),
  );

  assert.match(
    value,
    /function codexLinuxTitleBarOverlay\(e=1\)\{return\{color:r\.nativeTheme\.shouldUseDarkColors\?`#111111`:K4,symbolColor:r\.nativeTheme\.shouldUseDarkColors\?i3:r3,height:Math\.round\(30\*e\)\}\}/,
  );
  assert.match(
    value,
    /n===`linux`\?\{titleBarStyle:`hidden`,titleBarOverlay:codexLinuxTitleBarOverlay\(r\)\}/,
  );
  assert.doesNotMatch(value, /titleBarOverlay:\{color:r\.nativeTheme\.shouldUseDarkColors/);
  assert.deepEqual(warnings, []);
});

test("updates the Linux native titlebar overlay when nativeTheme changes", () => {
  const source = [
    "function A2(e){return e===`avatarOverlay`}",
    "function I2({platform:e,appearance:t,opaqueWindowsEnabled:n,prefersDarkColors:r}){return n&&!A2(t)&&(e===`darwin`||e===`win32`)?{backgroundColor:r?a2:o2,backgroundMaterial:e===`win32`?`none`:null}:e===`linux`&&!A2(t)?{backgroundColor:r?a2:o2,backgroundMaterial:null}:{backgroundColor:i2,backgroundMaterial:null}}",
    "function b2(e=1){return{color:i2,symbolColor:a.nativeTheme.shouldUseDarkColors?v2:_2,height:Math.round(g2*e)}}",
    "case`primary`:return n===`darwin`?t?{titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:{vibrancy:`menu`,titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:n===`win32`?{titleBarStyle:`hidden`,titleBarOverlay:b2(r)}:{titleBarStyle:`default`};",
    "installWindowsTitleBarOverlaySync(e,t){if(process.platform!==`win32`||t!==`primary`)return;let n=()=>{e.isDestroyed()||e.setTitleBarOverlay(b2(this.windowZooms.get(e.id)))};return a.nativeTheme.on(`updated`,n),n(),()=>{a.nativeTheme.off(`updated`,n)}}",
  ].join("");
  const patched = applyPatchTwice(applyLinuxNativeTitlebarPatch, source);

  assert.match(
    patched,
    /if\(\(process\.platform!==`win32`&&process\.platform!==`linux`\)\|\|t!==`primary`&&t!==`quickChat`\)return/,
  );
  assert.match(
    patched,
    /e\.setTitleBarOverlay\(process\.platform===`linux`\?codexLinuxTitleBarOverlay\(this\.windowZooms\.get\(e\.id\)\):b2\(this\.windowZooms\.get\(e\.id\)\)\)/,
  );
  assert.doesNotMatch(patched, /webContents\.executeJavaScript\(/);
  assert.doesNotMatch(patched, /data-codex-window-type/);
});

test("redirects the renamed Linux-aware titlebar overlay sync away from the transparent win32 helper", () => {
  const source = [
    "function A2(e){return e===`avatarOverlay`}",
    "function I2({platform:e,appearance:t,opaqueWindowsEnabled:n,prefersDarkColors:r}){return n&&!A2(t)&&(e===`darwin`||e===`win32`)?{backgroundColor:r?a2:o2,backgroundMaterial:e===`win32`?`none`:null}:e===`linux`&&!A2(t)?{backgroundColor:r?a2:o2,backgroundMaterial:null}:{backgroundColor:i2,backgroundMaterial:null}}",
    "function b2(e=1){return{color:i2,symbolColor:a.nativeTheme.shouldUseDarkColors?v2:_2,height:Math.round(g2*e)}}",
    "case`primary`:return n===`darwin`?t?{titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:{vibrancy:`menu`,titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:n===`win32`||n===`linux`?{titleBarStyle:`hidden`,titleBarOverlay:b2(r)}:{titleBarStyle:`default`};",
    "installApplicationMenuTitleBarOverlaySync(e,t){if(process.platform!==`win32`&&process.platform!==`linux`||t!==`primary`)return;let n=()=>{e.isDestroyed()||e.setTitleBarOverlay(b2(this.windowZooms.get(e.id)))};return a.nativeTheme.on(`updated`,n),n(),()=>{a.nativeTheme.off(`updated`,n)}}",
    "process.platform===`darwin`?n.setWindowButtonPosition(y2(t)):(process.platform===`win32`||process.platform===`linux`)&&(this.windowZooms.set(n.id,t),n.setTitleBarOverlay(b2(t)))",
  ].join("");
  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(applyLinuxNativeTitlebarPatch, source),
  );

  assert.match(
    patched,
    /n===`linux`\?\{titleBarStyle:`hidden`,titleBarOverlay:codexLinuxTitleBarOverlay\(r\)\}/,
  );
  assert.match(
    patched,
    /installApplicationMenuTitleBarOverlaySync\(e,t\)\{if\(\(process\.platform!==`win32`&&process\.platform!==`linux`\)\|\|t!==`primary`&&t!==`quickChat`\)return/,
  );
  assert.match(
    patched,
    /e\.setTitleBarOverlay\(process\.platform===`linux`\?codexLinuxTitleBarOverlay\(this\.windowZooms\.get\(e\.id\)\):b2\(this\.windowZooms\.get\(e\.id\)\)\)/,
  );
  assert.match(
    patched,
    /n\.setTitleBarOverlay\(process\.platform===`linux`\?codexLinuxTitleBarOverlay\(t\):b2\(t\)\)/,
  );
  assert.doesNotMatch(patched, /setTitleBarOverlay\(b2\(/);
  assert.deepEqual(warnings, []);
});


test("updates every Linux zoom titlebar overlay refresh call site", () => {
  const source = [
    "function A2(e){return e===`avatarOverlay`}",
    "function I2({platform:e,appearance:t,opaqueWindowsEnabled:n,prefersDarkColors:r}){return n&&!A2(t)&&(e===`darwin`||e===`win32`)?{backgroundColor:r?a2:o2,backgroundMaterial:e===`win32`?`none`:null}:e===`linux`&&!A2(t)?{backgroundColor:r?a2:o2,backgroundMaterial:null}:{backgroundColor:i2,backgroundMaterial:null}}",
    "function b2(e=1){return{color:i2,symbolColor:a.nativeTheme.shouldUseDarkColors?v2:_2,height:Math.round(g2*e)}}",
    "case`primary`:return n===`darwin`?t?{titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:{vibrancy:`menu`,titleBarStyle:`hiddenInset`,trafficLightPosition:y2(r)}:n===`win32`||n===`linux`?{titleBarStyle:`hidden`,titleBarOverlay:b2(r)}:{titleBarStyle:`default`};",
    "installApplicationMenuTitleBarOverlaySync(e,t){if(process.platform!==`win32`&&process.platform!==`linux`||t!==`primary`)return;let n=()=>{e.isDestroyed()||e.setTitleBarOverlay(b2(this.windowZooms.get(e.id)))};return a.nativeTheme.on(`updated`,n),n(),()=>{a.nativeTheme.off(`updated`,n)}}",
    "process.platform===`darwin`?n.setWindowButtonPosition(y2(t)):(process.platform===`win32`||process.platform===`linux`)&&(this.windowZooms.set(n.id,t),n.setTitleBarOverlay(b2(t)))",
    "process.platform===`darwin`?o.setWindowButtonPosition(y2(i)):(process.platform===`win32`||process.platform===`linux`)&&(this.windowZooms.set(o.id,i),o.setTitleBarOverlay(b2(i)))",
  ].join("");
  const patched = applyPatchTwice(applyLinuxNativeTitlebarPatch, source);

  assert.equal(
    (patched.match(/setTitleBarOverlay\(process\.platform===`linux`\?codexLinuxTitleBarOverlay/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(
    patched,
    /\(process\.platform===`win32`\|\|process\.platform===`linux`\)&&\(this\.windowZooms\.set\([^)]+\),[A-Za-z_$][\w$]*\.setTitleBarOverlay\(b2\([^)]+\)\)\)/,
  );
});

test("adds a right-side safe area for Linux window controls in application menu chrome", () => {
  const source = [
    "var l=Object.freeze({default:Object.freeze({left:0,right:0}),mac:Object.freeze({legacy:Object.freeze({left:66+c,right:0}),modern:Object.freeze({left:76+c,right:0})}),applicationMenu:Object.freeze({left:0,right:0})});",
    "var m=Object.freeze({applicationMenu:Object.freeze({left:0,right:0})});",
  ].join("");

  const patched = applyPatchTwice(applyLinuxWindowControlsSafeAreaPatch, source);

  assert.equal(
    (patched.match(/applicationMenu:Object\.freeze\(\{left:0,right:138\}\)/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(
    patched,
    /applicationMenu:Object\.freeze\(\{left:0,right:0\}\)/,
  );
});

test("patches remaining Linux window controls safe areas when another copy is already patched", () => {
  const source = [
    "var l=Object.freeze({applicationMenu:Object.freeze({left:0,right:138})});",
    "var m=Object.freeze({applicationMenu:Object.freeze({left:0,right:0})});",
  ].join("");

  const patched = applyPatchTwice(applyLinuxWindowControlsSafeAreaPatch, source);

  assert.equal(
    (patched.match(/applicationMenu:Object\.freeze\(\{left:0,right:138\}\)/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(
    patched,
    /applicationMenu:Object\.freeze\(\{left:0,right:0\}\)/,
  );
});

test("keeps tooltips out of the Linux window controls titlebar area", () => {
  const middleware =
    "middleware:[a({mainAxis:C,crossAxis:t}),c({padding:8}),l({padding:8}),u({padding:8,apply({availableWidth:e,availableHeight:t,elements:n,rects:r}){n.floating.style.setProperty(`--radix-tooltip-trigger-width`,`1px`)}})]";
  const source = `${middleware};${middleware}`;

  const patched = applyPatchTwice(applyLinuxTooltipWindowControlsCollisionPatch, source);

  assert.equal(
    (patched.match(/padding:\{top:44,right:8,bottom:8,left:8\}/g) ?? []).length,
    6,
  );
  assert.doesNotMatch(patched, /[,(]\{padding:8\}/);
});

test("patches remaining tooltip collision middleware when another copy is already patched", () => {
  const patchedMiddleware =
    "middleware:[a({mainAxis:C,crossAxis:t}),c({padding:{top:44,right:8,bottom:8,left:8}}),l({padding:{top:44,right:8,bottom:8,left:8}}),u({padding:{top:44,right:8,bottom:8,left:8},apply({availableWidth:e,availableHeight:t,elements:n,rects:r}){n.floating.style.setProperty(`--radix-tooltip-trigger-width`,`1px`)}})]";
  const defaultMiddleware =
    "middleware:[a({mainAxis:C,crossAxis:t}),c({padding:8}),l({padding:8}),u({padding:8,apply({availableWidth:e,availableHeight:t,elements:n,rects:r}){n.floating.style.setProperty(`--radix-tooltip-trigger-width`,`1px`)}})]";
  const source = `${patchedMiddleware};${defaultMiddleware}`;

  const patched = applyPatchTwice(applyLinuxTooltipWindowControlsCollisionPatch, source);

  assert.equal(
    (patched.match(/padding:\{top:44,right:8,bottom:8,left:8\}/g) ?? []).length,
    6,
  );
  assert.doesNotMatch(patched, /[,(]\{padding:8\}/);
});

test("keeps tooltip collision padding after middleware alias drift", () => {
  const source =
    "middleware:[o({mainAxis:ne,crossAxis:t}),l({padding:8}),u({padding:8}),d({padding:8,apply({availableWidth:e,availableHeight:t,elements:n,rects:r}){n.floating.style.setProperty(`--radix-tooltip-trigger-width`,`1px`)}})]";

  const patched = applyPatchTwice(applyLinuxTooltipWindowControlsCollisionPatch, source);

  assert.match(patched, /o\(\{mainAxis:ne,crossAxis:t\}\),l\(\{padding:\{top:44,right:8,bottom:8,left:8\}\}\),u\(\{padding:\{top:44,right:8,bottom:8,left:8\}\}\),d\(\{padding:\{top:44,right:8,bottom:8,left:8\},apply/);
  assert.doesNotMatch(patched, /[,(]\{padding:8\}/);
});

test("removes native title tooltip from the thread side panel toolbar action", () => {
  const toolbar =
    "function dt(e){let t=(0,X.c)(11),{children:n,disabled:r,label:i,onClick:a,color:o,pressed:s,shortcut:c}=e,l=r===void 0?!1:r,u=o===`outline`?s?`outlineActive`:`outline`:s?`secondary`:`ghost`,d;t[0]!==n||t[1]!==l||t[2]!==i||t[3]!==a||t[4]!==s||t[5]!==u?(d=(0,q.jsx)(R,{size:`toolbar`,color:u,\"aria-label\":i,\"aria-pressed\":s,disabled:l,title:i,onClick:a,uniform:!0,children:n}),t[0]=n,t[1]=l,t[2]=i,t[3]=a,t[4]=s,t[5]=u,t[6]=d):d=t[6];let f;return t[7]!==i||t[8]!==c||t[9]!==d?(f=(0,q.jsx)(L,{tooltipContent:i,shortcut:c,delayOpen:!0,children:d}),t[7]=i,t[8]=c,t[9]=d,t[10]=f):f=t[10],f}var Rt=j({toggleSidePanel:{id:`thread.sidePanel.toggle`,defaultMessage:`Toggle side panel`,description:`Toggles the thread side panel in a local or new thread`}});";
  const source = `${toolbar}${toolbar}`;

  const patched = applyPatchTwice(applyLinuxThreadSidePanelNativeTooltipPatch, source);

  assert.match(patched, /"aria-label":i/);
  assert.match(patched, /tooltipContent:i/);
  assert.doesNotMatch(patched, /title:i/);
});

test("removes the Linux menu next to Windows removeMenu calls", () => {
  const source = "process.platform===`win32`&&k.removeMenu(),";
  const patched = applyPatchTwice(applyLinuxMenuPatch, source);

  assert.equal(
    patched,
    "process.platform===`linux`&&k.removeMenu(),process.platform===`win32`&&k.removeMenu(),",
  );
});

test("patches remaining Windows menu snippets when another copy is already Linux-patched", () => {
  const windowsMenuSnippet = "process.platform===`win32`&&k.removeMenu(),";
  const linuxMenuPatch = "process.platform===`linux`&&k.removeMenu(),";
  const source = `${linuxMenuPatch}${windowsMenuSnippet}function createSecondWindow(){${windowsMenuSnippet}}`;

  const patched = applyPatchTwice(applyLinuxMenuPatch, source);

  assert.equal((patched.match(/removeMenu\(\)/g) ?? []).length, 4);
  assert.match(
    patched,
    /function createSecondWindow\(\)\{process\.platform===`linux`&&k\.removeMenu\(\),process\.platform===`win32`&&k\.removeMenu\(\),\}/,
  );
});

test("upgrades legacy Linux menu snippets to remove the menu", () => {
  const source =
    "process.platform===`linux`&&(k.setMenuBarVisibility(!1),k.removeMenu?.()),process.platform===`win32`&&k.removeMenu(),";

  const patched = applyPatchTwice(applyLinuxMenuPatch, source);

  assert.equal(
    patched,
    "process.platform===`linux`&&k.removeMenu(),process.platform===`win32`&&k.removeMenu(),",
  );
  assert.doesNotMatch(patched, /setMenuBarVisibility/);
});

test("recognizes the Linux removeMenu snippet as already applied", () => {
  const source =
    "process.platform===`linux`&&k.removeMenu(),process.platform===`win32`&&k.removeMenu(),";

  const patched = applyPatchTwice(applyLinuxMenuPatch, source);

  assert.equal(patched, source);
  assert.equal((patched.match(/process\.platform===`linux`&&k\.removeMenu\(\),/g) ?? []).length, 1);
});

test("preserves the global application menu on Linux for accelerators", () => {
  const source =
    "let $e=[{role:`help`,submenu:[]}],et=n.Menu.buildFromTemplate($e);n.Menu.setApplicationMenu(et);";
  const patched = applyPatchTwice(applyLinuxApplicationMenuPatch, source);

  assert.equal(patched, source);
});

test("migrates a Linux-suppressed application menu back to the real menu", () => {
  const source =
    "let et=n.Menu.buildFromTemplate($e);n.Menu.setApplicationMenu(process.platform===`linux`?null:et);";

  const patched = applyPatchTwice(applyLinuxApplicationMenuPatch, source);

  assert.equal(patched, "let et=n.Menu.buildFromTemplate($e);n.Menu.setApplicationMenu(et);");
});

test("recognizes already-applied Linux opaque background patch", () => {
  const patched = applyPatchTwice(applyLinuxOpaqueBackgroundPatch, alreadyOpaqueBackgroundBundle);
  assert.equal(patched, alreadyOpaqueBackgroundBundle);
});

test("uses the local transparent appearance predicate for Linux opaque backgrounds", () => {
  const patched = applyPatchTwice(
    applyLinuxOpaqueBackgroundPatch,
    opaqueBackgroundBundleWithDriftingGw,
  );

  assert.match(patched, /e===`linux`&&!OM\(t\)\?\{backgroundColor:r\?lM:uM/);
  assert.doesNotMatch(patched, /process\.platform===`linux`&&!gw\(t\)/);
});

test("patches current BrowserWindow background helper shape for Linux opaque backgrounds", () => {
  const patched = applyPatchTwice(applyLinuxOpaqueBackgroundPatch, currentOpaqueBackgroundBundle);

  assert.match(
    patched,
    /:e===`linux`&&!vq\(t\)\?\{backgroundColor:r\?\$K:eq,backgroundMaterial:null\}:e===`win32`&&!vq\(t\)\?/,
  );
  assert.match(patched, /vq\(e\).*hotkeyWindowThread/);
});

test("patches current opaque window surface background helper shape for Linux", () => {
  const patched = applyPatchTwice(applyLinuxOpaqueBackgroundPatch, currentOpaqueWindowSurfaceBackgroundBundle);

  assert.match(
    patched,
    /:e===`linux`&&!g3\(t\)\?\{backgroundColor:r\?G4:K4,backgroundMaterial:null\}:e===`win32`&&!g3\(t\)\?/,
  );
  assert.match(
    patched,
    /shouldAlwaysUseOpaqueWindowSurface\(e\)\{return process\.platform===`linux`&&!g3\(e\)\|\|v3\(\{appearance:e,opaqueWindowsEnabled:this\.isOpaqueWindowsEnabled\(\),platform:process\.platform\}\)\|\|!BA\(\)&&!g3\(e\)\}/,
  );
  assert.match(patched, /opaqueWindowSurfaceEnabled:n/);
});

test("patches current webview opaque window default bundle shapes", () => {
  const resolvedThemeSource =
    "function oe(e,t){let n=o[t];return{accent:p(e?.accent)??n.accent,contrast:se(e?.contrast,n.contrast),fonts:le(e?.fonts),ink:p(e?.ink)??n.ink,opaqueWindows:e?.opaqueWindows??n.opaqueWindows,semanticColors:ue(e?.semanticColors,n.semanticColors),surface:p(e?.surface)??n.surface}}";
  const runtimeSource =
    "let{data:c}=Qc(y.APPEARANCE_LIGHT_CHROME_THEME,s),l;let{data:u}=Qc(y.APPEARANCE_DARK_CHROME_THEME,l),d;let x=b,S;let C=o===`light`?x:S,w;if(C.opaqueWindows&&!ba()){e.classList.add(`electron-opaque`)}";
  const appMainRuntimeSource =
    "document.querySelector(`[data-codex-window-type=\"electron\"]`);if(e){if((g.opaqueWindows||i)&&!pc()){e.classList.add(`electron-opaque`);return}e.classList.remove(`electron-opaque`)}";
  const settingsSource =
    "function sn(){let{canImportThemeString:u,setThemePatch:b,theme:x}=p(t),S=vn(r,t),k=[{label:i}],A=[];return x.opaqueWindows}";

  const patchedResolvedTheme = applyPatchTwice(applyLinuxOpaqueWindowsDefaultPatch, resolvedThemeSource);
  const patchedRuntime = applyPatchTwice(applyLinuxOpaqueWindowsDefaultPatch, runtimeSource);
  const patchedAppMainRuntime = applyPatchTwice(applyLinuxOpaqueWindowsDefaultPatch, appMainRuntimeSource);
  const patchedSettings = applyPatchTwice(applyLinuxOpaqueWindowsDefaultPatch, settingsSource);

  assert.match(patchedResolvedTheme, /opaqueWindows:e\?\.opaqueWindows\?\?\(typeof navigator<`u`&&/);
  assert.match(
    patchedRuntime,
    /document\.documentElement\.dataset\.codexOs===`linux`&&\(\(o===`light`\?c:u\)\?\.opaqueWindows==null&&\(C=\{\.\.\.C,opaqueWindows:!0\}\)\)/,
  );
  assert.match(
    patchedSettings,
    /navigator\.userAgent\.includes\(`Linux`\)&&x\?\.opaqueWindows==null&&\(x=\{\.\.\.x,opaqueWindows:!0\}\);let S=/,
  );
  assert.match(
    patchedAppMainRuntime,
    /document\.documentElement\.dataset\.codexOs===`linux`&&g\.opaqueWindows==null&&\(g=\{\.\.\.g,opaqueWindows:!0\}\),\(g\.opaqueWindows\|\|i\)&&!pc\(\)/,
  );
});

test("patches current comment preload screenshot anchor and marker shapes", () => {
  const source = [
    "let Xe=(M?j?.kind===`comment`?ge:[]:Ye==null?ge:ge.filter(e=>e.id!==Ye.id)).flatMap(e=>{let t=pe.get(e.id);if(t==null)return[];return[{comment:e,commentNumber:t}]}),",
    "let at=null,ot=`hover-box`,st;if(M&&j?.annotation.anchor.kind===`element`){let e=tt==null?null:ed(tt);at=e?.rect??Td(j.annotation.anchor),st=e?.borderRadius,ot=Wd(j.annotation.anchor,at,S.width,S.height)}else if(M&&j?.kind===`comment`&&j.annotation.anchor.kind===`region`)at=Td(j.annotation.anchor),ot=Hd(j.annotation.anchor,at,S.width,S.height);",
  ].join("");

  const patched = applyPatchTwice(applyBrowserAnnotationScreenshotPatch, source);

  assert.match(
    patched,
    /Xe=\(M\?j\?\.kind===`comment`\?ge\.filter\(e=>e\.id===j\.annotation\.id\):\[\]:Ye==null\?ge:ge\.filter\(e=>e\.id!==Ye\.id\)\)\.flatMap/,
  );
  assert.match(
    patched,
    /if\(M&&j\?\.annotation\.anchor\.kind===`element`\)\{at=Td\(j\.annotation\.anchor\),st=void 0,ot=Wd\(j\.annotation\.anchor,at,S\.width,S\.height\)\}/,
  );
});

test("patches drifted comment preload screenshot anchor helper names", () => {
  const source =
    "let rect=null,css=`hover-box`,radius;if(enabled&&selected?.annotation.anchor.kind===`element`){let e=node==null?null:measure(node);rect=e?.rect??anchorRect(selected.annotation.anchor),radius=e?.borderRadius,css=highlight(selected.annotation.anchor,rect,viewport.width,viewport.height)}";

  const patched = applyPatchTwice(applyBrowserAnnotationScreenshotPatch, source);

  assert.match(
    patched,
    /if\(enabled&&selected\?\.annotation\.anchor\.kind===`element`\)\{rect=anchorRect\(selected\.annotation\.anchor\),radius=void 0,css=highlight\(selected\.annotation\.anchor,rect,viewport\.width,viewport\.height\)\}/,
  );
  assert.doesNotMatch(patched, /\bWd\(/);
  assert.doesNotMatch(patched, /\bS\.width\b/);
});

test("patches current comment preload screenshot marker selection list", () => {
  const source =
    "let Ue=M?.annotation.id??null,We=M?.kind===`comment`?[M.annotation]:he,Ge=M!=null&&g!=null,Ke=m?.target.mode===`create`?oo(m.anchor):null,qe=m?.target.mode===`create`&&m.anchor.type===`element`?m.anchor.viewportSize:void 0,Je=Ke==null?null:he.find(e=>le(e.anchor,Ke))??null,Ye=(Ge?M?.kind===`comment`?he:[]:Je==null?he:he.filter(e=>e.id!==Je.id)).flatMap(e=>{let t=fe.get(e.id);if(t==null)return[];return[{comment:e,commentNumber:t}]})";

  const patched = applyPatchTwice(applyBrowserAnnotationScreenshotPatch, source);

  assert.match(
    patched,
    /Ye=\(Ge\?M\?\.kind===`comment`\?We:\[\]:Je==null\?he:he\.filter\(e=>e\.id!==Je\.id\)\)\.flatMap/,
  );
  assert.doesNotMatch(patched, /Ge\?M\?\.kind===`comment`\?he:\[\]/);
});

test("patches Electron 42 comment preload screenshot marker selection list", () => {
  const source =
    "let Ue=g==null?null:ge.find(e=>e.id===g)??null,We=g==null?null:we.find(e=>e.id===g)??null,A=Ue==null?We==null?null:{kind:`design`,annotation:We}:{kind:`comment`,annotation:Ue},Ge=A?.annotation.id??null,Ke=A?.kind===`comment`?[A.annotation]:ge,qe=A!=null&&g!=null,Je=m?.target.mode===`create`?ho(m.anchor):null,Ye=m?.target.mode===`create`&&m.anchor.type===`element`?m.anchor.viewportSize:void 0,Xe=Je==null?null:ge.find(e=>ue(e.anchor,Je))??null,Ze=(qe?A?.kind===`comment`?ge:[]:Xe==null?ge:ge.filter(e=>e.id!==Xe.id)).flatMap(e=>{let t=fe.get(e.id);if(t==null)return[];return[{comment:e,commentNumber:t}]})";

  const patched = applyPatchTwice(applyBrowserAnnotationScreenshotPatch, source);

  assert.match(
    patched,
    /Ze=\(qe\?A\?\.kind===`comment`\?Ke:\[\]:Xe==null\?ge:ge\.filter\(e=>e\.id!==Xe\.id\)\)\.flatMap/,
  );
  assert.doesNotMatch(patched, /qe\?A\?\.kind===`comment`\?ge:\[\]/);
});

test("guards fast-mode model tier lookup when serviceTiers is missing", () => {
  const source =
    "function m(e){return e.serviceTiers.length>0||e.additionalSpeedTiers?.includes(u)===!0}";

  const patched = applyPatchTwice(applyLinuxFastModeModelGuardPatch, source);

  assert.match(patched, /\(e\?\.serviceTiers\?\.length\?\?0\)>0/);
  assert.doesNotMatch(patched, /e\.serviceTiers\.length/);
});

test("guards drifted fast-mode tier lookup shapes", () => {
  const source = [
    "function y(t){return t.serviceTiers.length > 0 || t.additionalSpeedTiers?.includes(`fast`)}",
    "const z=e=>e.serviceTiers.length>0||e.additionalSpeedTiers.includes(\"fast\")===!0;",
  ].join(";");

  const patched = applyPatchTwice(applyLinuxFastModeModelGuardPatch, source);

  assert.match(patched, /\(t\?\.serviceTiers\?\.length\?\?0\)>0\|\|t\?\.additionalSpeedTiers\?\.includes\(`fast`\)===!0/);
  assert.match(patched, /\(e\?\.serviceTiers\?\.length\?\?0\)>0\|\|e\?\.additionalSpeedTiers\?\.includes\("fast"\)===!0/);
  assert.doesNotMatch(patched, /[te]\.serviceTiers\.length/);
});

test("warns when the fast-mode tier lookup is recognizable but unpatchable", () => {
  const { value, warnings } = captureWarns(() =>
    applyLinuxFastModeModelGuardPatch(
      "function m(e){return currentModel().serviceTiers.length > 0 || e.additionalSpeedTiers?.includes(u)===!0}",
    ),
  );

  assert.equal(
    value,
    "function m(e){return currentModel().serviceTiers.length > 0 || e.additionalSpeedTiers?.includes(u)===!0}",
  );
  assert.deepEqual(warnings, [
    "WARN: Could not find fast-mode model guard insertion point — skipping fast-mode crash guard patch",
  ]);
});

test("treats current service-tier helper bundles as already guarded", () => {
  const source = [
    "function sA(e,t){return t==null?null:t===`fast`?uA(e):e?.serviceTiers?.find(e=>e.id===t)??null}",
    "function cA(e){return[{description:tA.standardDescription},...(e?.serviceTiers??[]).map(e=>({tier:e,value:e.id}))]}",
    "function uA(e){return e?.serviceTiers?.find(e=>rA(e.id,e.name)===`fast`)??null}",
  ].join("");

  const { value, warnings } = captureWarns(() => applyLinuxFastModeModelGuardPatch(source));

  assert.equal(value, source);
  assert.deepEqual(warnings, []);
});

test("dedupes flattened skills lists across repeated cwd buckets", () => {
  const source = [
    "const handlers={\"list-skills-for-host\":()=>null};",
    "function FJ(){let y=[",
    "{skills:[{path:`/skills/a/SKILL.md`,name:`A`},{path:`/skills/b/SKILL.md`,name:`B`},{name:`Loose`}]},",
    "{skills:[{path:`/skills/a/SKILL.md`,name:`A duplicate`},{id:`skill-c`,name:`C`},{name:`Loose duplicate`}]},",
    "{skills:[{id:`skill-c`,name:`C duplicate`},{privateIdentity:`plugin-d`,name:`D`},{privateIdentity:`plugin-d`,name:`D duplicate`}]}",
    "],b;b=y.flatMap(IJ);return b}",
    "function IJ(e){return e.skills}",
  ].join("");

  const patched = applyPatchTwice(applyLinuxSkillsListDedupePatch, source);

  assert.match(patched, /function codexLinuxDedupeSkills/);
  assert.match(patched, /b=codexLinuxDedupeSkills\(y\.flatMap\(IJ\)\)/);

  const result = vm.runInNewContext(`${patched};FJ();`);
  const names = Array.from(result, (skill) => skill.name);
  assert.deepEqual(
    names,
    ["A", "B", "Loose", "C", "Loose duplicate", "D"],
  );
});

test("warns when the skills hook is recognizable but the flatten shape drifted", () => {
  const source = [
    "const handlers={\"list-skills-for-host\":()=>null};",
    "function FJ(){let y=[],b;b=y.flatMap(e=>e.skills);return b}",
    "function IJ(e){return e.skills}",
  ].join("");

  const { value, warnings } = captureWarns(() => applyLinuxSkillsListDedupePatch(source));

  assert.equal(value, source);
  assert.deepEqual(warnings, [
    "WARN: Could not find skills list flatten insertion point — skipping Linux skills dedupe patch",
  ]);
});

test("warns when a matched webview opaque bundle has no known insertion point", () => {
  const { warnings } = captureWarns(() =>
    applyLinuxOpaqueWindowsDefaultPatch("function runtime(){let C=theme;if(C.opaqueWindows&&!ba()){}}"),
  );

  assert.deepEqual(warnings, [
    "WARN: Could not find Linux opaque window default insertion point — skipping settings default patch",
  ]);
});

test("does not treat unrelated Linux userAgent checks as opaque window patches", () => {
  const { warnings } = captureWarns(() =>
    applyLinuxOpaqueWindowsDefaultPatch(
      "function unrelated(){return navigator.userAgent.includes(`Linux`)&&ready}function runtime(){let C=theme;if(C.opaqueWindows&&!ba()){}}",
    ),
  );

  assert.deepEqual(warnings, [
    "WARN: Could not find Linux opaque window default insertion point — skipping settings default patch",
  ]);
});

test("adds Linux avatar overlay mouse passthrough recovery", () => {
  const patched = applyPatchTwice(
    applyLinuxAvatarOverlayMousePassthroughPatch,
    avatarOverlayBundleFixture(),
  );

  assert.match(patched, /codexLinuxAvatarPassthroughRecoveryTimer/);
  assert.match(patched, /codexLinuxStartAvatarPassthroughRecovery\(\)/);
  assert.match(patched, /codexLinuxStopAvatarPassthroughRecovery\(\)/);
  assert.match(patched, /codexLinuxSyncAvatarPointerInteractivity\(e\)/);
  assert.match(patched, /codexLinuxBuildAvatarInputShape\(e\)/);
  assert.match(patched, /codexLinuxApplyAvatarInputShape\(e\)/);
  assert.match(patched, /codexLinuxIsI3Session\(\)/);
  assert.match(patched, /process\.env\.I3SOCK/);
  assert.match(patched, /codexLinuxApplyAvatarCompositorHints\(e\)/);
  assert.match(patched, /getNativeWindowHandle\?\.\(\)/);
  assert.match(patched, /u\.execFile\(`xdotool`,\[`search`,`--pid`,String\(process\.pid\)\]/);
  assert.match(patched, /u\.execFile\(`xwininfo`,\[`-id`,e\]/);
  assert.match(patched, /u\.execFile\(`xprop`/);
  assert.match(patched, /_GTK_FRAME_EXTENTS/);
  assert.match(patched, /Override Redirect State/);
  assert.match(patched, /Absolute upper-left X/);
  assert.match(patched, /Number\(l\)!==t\.x/);
  assert.match(patched, /Number\(h\)!==t\.y/);
  assert.match(patched, /Number\(d\)!==t\.width/);
  assert.doesNotMatch(patched, /let\[,l,u,d,f\]=c/);
  assert.doesNotMatch(patched, /this\.codexLinuxIsI3Session\(\)\)\{this\.codexLinuxStopAvatarPassthroughRecovery\(\),this\.codexLinuxAvatarInputShapeKey=null,this\.pointerInteractive=!0,this\.mousePassthroughEnabled&&\(this\.mousePassthroughEnabled=!1\),e\.setIgnoreMouseEvents\(!1\);return\}/);
  assert.match(patched, /if\(this\.codexLinuxIsAvatarShapeBackend\(\)&&typeof e\.setShape==`function`\)\{/);
  assert.match(patched, /if\(this\.codexLinuxIsAvatarShapeBackend\(\)&&typeof e\.setShape==`function`\)\{this\.codexLinuxStartAvatarPassthroughRecovery\(\),/);
  assert.match(patched, /codexLinuxIsAvatarShapeBackend\(\)\{/);
  assert.match(patched, /getSwitchValue\(`ozone-platform`\)/);
  assert.match(patched, /return e===`x11`\|\|e===``&&!process\.env\.WAYLAND_DISPLAY/);
  assert.doesNotMatch(patched, /XDG_SESSION_TYPE/);
  assert.doesNotMatch(patched, /if\(process\.platform===`linux`&&typeof e\.setShape==`function`\)\{this\.codexLinuxStopAvatarPassthroughRecovery\(\),/);
  assert.doesNotMatch(patched, /typeof e\.setShape==`function`&&!this\.codexLinuxIsI3Session\(\)/);
  assert.match(patched, /if\(t==null\)return null/);
  assert.match(patched, /try\{let t=this\.codexLinuxBuildAvatarInputShape\(e\);if\(t==null\)return!1;let n=JSON\.stringify\(t\)/);
  assert.match(patched, /e\.setShape\(t\),this\.codexLinuxAvatarInputShapeKey=n;return!0/);
  assert.match(patched, /return\[i\(t\.mascot\),i\(t\.tray\)\]\.filter\(Boolean\)/);
  assert.match(patched, /process\.platform!==`linux`/);
  assert.match(patched, /setInterval\(\(\)=>\{let e=this\.window/);
  assert.match(patched, /\},32\)/);
  assert.doesNotMatch(patched, /typeof e\.setShape==`function`\)return;this\.codexLinuxAvatarPassthroughRecoveryTimer=setInterval/);
  assert.match(patched, /this\.dragState!=null/);
  assert.match(patched, /this\.codexLinuxIsCursorInAvatarInteractiveRegion\(e\)/);
  assert.match(patched, /__codexWindowHit=__codexX>=0&&__codexY>=0&&__codexX<=__codexBounds\.width&&__codexY<=__codexBounds\.height/);
  assert.match(patched, /return __codexHit\(t\.mascot\)\|\|__codexHit\(t\.tray\)/);
  assert.doesNotMatch(patched, /return __codexHit\(t\.mascot\)\|\|__codexHit\(t\.tray\)\|\|__codexWindowHit/);
  assert.doesNotMatch(patched, /let r=r\.screen\.getCursorScreenPoint\(\)/);
  assert.match(patched, /catch\{t=!0\}/);
  assert.match(patched, /this\.pointerInteractive=t/);
  assert.match(patched, /displayBounds:n\.screen\.getDisplayNearestPoint\(n\.screen\.getCursorScreenPoint\(\)\)\.bounds\},process\.platform===`linux`&&\(this\.pointerInteractive=!0,this\.applyPointerInteractivityPolicy\(\)\)\}moveDrag\(e\)/);
  assert.match(patched, /this\.dragState=null,this\.reclampWindowToVisibleDisplay\(\{shouldPersist:!0\}\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)/);
  assert.match(patched, /this\.applyLayout\(r\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)/);
  assert.match(patched, /this\.codexLinuxAvatarCompositorHintsApplied=!1,this\.codexLinuxAvatarCompositorHintsApplying=!1,this\.rendererReady=/);
  assert.match(patched, /traySize:process\.platform===`linux`&&typeof this\.codexLinuxIsI3Session==`function`&&this\.codexLinuxIsI3Session\(\)\?this\.traySize:this\.traySize\?\?sV/);
  assert.match(patched, /this\.setWindowBounds\(e,r\.windowBounds\),this\.sendLayoutToRenderer\(e\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)/);
  assert.match(patched, /e\.moveTop\(\),e\.showInactive\(\),process\.platform===`linux`&&this\.codexLinuxApplyAvatarCompositorHints\(e\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)/);
  assert.doesNotMatch(patched, /codexLinuxRecoverAvatarPointerInteractivity/);
  assert.match(patched, /this\.window===t&&\(this\.codexLinuxStopAvatarPassthroughRecovery\(\),this\.codexLinuxAvatarInputShapeKey=null,this\.codexLinuxAvatarCompositorHintsApplied=!1,this\.codexLinuxAvatarCompositorHintsApplying=!1,this\.cancelMomentum\(\)/);
});

test("keeps Linux avatar overlay above the app while reply inputs are focusable", () => {
  const patched = applyPatchTwice(
    applyLinuxAvatarOverlayMousePassthroughPatch,
    avatarOverlayBundleFixture(),
  );

  assert.match(
    patched,
    /appearance:`avatarOverlay`,alwaysOnTop:process\.platform===`linux`,skipTaskbar:process\.platform===`linux`,focusable:process\.platform===`linux`\?!0:!1,show:!1/,
  );
  assert.doesNotMatch(patched, /appearance:`avatarOverlay`,focusable:!1,show:!1/);

  const nonAvatarSource = "async createWindow(){return this.windowManager.createWindow({appearance:`main`,focusable:!1,show:!1})}";
  assert.equal(
    applyPatchTwice(applyLinuxAvatarOverlayMousePassthroughPatch, nonAvatarSource),
    nonAvatarSource,
  );
});

test("Linux avatar overlay interactivity is bounded to avatar regions", () => {
  const patched = applyPatchTwice(
    applyLinuxAvatarOverlayMousePassthroughPatch,
    avatarOverlayBundleFixture(),
  );
  const cursor = { x: 5843, y: 1036 };
  let ozonePlatform = "";
  const context = {
    globalThis: {},
    process: {
      env: {},
      pid: 123,
      platform: "linux",
    },
    require(moduleName) {
      assert.equal(moduleName, "node:child_process");
      return { execFile() {} };
    },
    pV(bounds) {
      return bounds;
    },
    n: {
      app: {
        getName: () => "Codex",
        commandLine: { getSwitchValue: () => ozonePlatform },
      },
      screen: {
        getCursorScreenPoint: () => cursor,
        getDisplayNearestPoint: () => ({ bounds: { x: 0, y: 0, width: 800, height: 600 } }),
      },
    },
  };
  vm.runInNewContext(`${patched};globalThis.AvatarOverlayController=fV;`, context);

  const controller = new context.globalThis.AvatarOverlayController(
    { sendMessageToAllRegisteredWindows() {} },
    { set() {} },
  );
  controller.layout = {
    mascot: { left: 220, top: 190, width: 113, height: 122 },
    tray: { left: 57, top: 55, width: 276, height: 131 },
  };

  assert.equal(
    controller.codexLinuxIsCursorInAvatarInteractiveRegion({
      getContentBounds: () => ({ x: 5743, y: 936, width: 356, height: 320 }),
    }),
    true,
  );
  cursor.x = 5765;
  cursor.y = 1088;
  assert.equal(
    controller.codexLinuxIsCursorInAvatarInteractiveRegion({
      getContentBounds: () => ({ x: 5743, y: 936, width: 356, height: 320 }),
    }),
    false,
  );
  assert.equal(
    controller.codexLinuxIsCursorInAvatarInteractiveRegion({
      getContentBounds: () => ({ x: 6000, y: 936, width: 100, height: 100 }),
    }),
    false,
  );

  const overlayWindow = {
    isDestroyed: () => false,
    getContentBounds: () => ({ x: 5743, y: 936, width: 356, height: 320 }),
    setShape() {},
  };
  const serializeShape = (shape) => JSON.parse(JSON.stringify(shape));
  assert.deepEqual(serializeShape(controller.codexLinuxBuildAvatarInputShape(overlayWindow)), [
    { x: 220, y: 190, width: 113, height: 122 },
    { x: 57, y: 55, width: 276, height: 131 },
  ]);
  controller.pointerInteractive = true;
  assert.deepEqual(serializeShape(controller.codexLinuxBuildAvatarInputShape(overlayWindow)), [
    { x: 220, y: 190, width: 113, height: 122 },
    { x: 57, y: 55, width: 276, height: 131 },
  ]);
  controller.dragState = {};
  assert.deepEqual(serializeShape(controller.codexLinuxBuildAvatarInputShape(overlayWindow)), [
    { x: 0, y: 0, width: 356, height: 320 },
  ]);
  controller.dragState = null;
  context.process.env.WAYLAND_DISPLAY = "wayland-0";
  assert.equal(controller.codexLinuxIsAvatarShapeBackend(), false);
  assert.equal(controller.codexLinuxApplyAvatarInputShape(overlayWindow), false);
  let setShapeCalls = 0;
  ozonePlatform = "x11";
  assert.equal(controller.codexLinuxIsAvatarShapeBackend(), true);
  assert.equal(
    controller.codexLinuxApplyAvatarInputShape({
      ...overlayWindow,
      setShape() {
        setShapeCalls += 1;
      },
    }),
    true,
  );
  assert.equal(setShapeCalls, 1);
  ozonePlatform = "wayland";
  assert.equal(controller.codexLinuxIsAvatarShapeBackend(), false);
  assert.equal(
    controller.codexLinuxApplyAvatarInputShape({
      isDestroyed: () => false,
      getContentBounds: () => {
        throw new Error("drift");
      },
      setShape() {},
    }),
    false,
  );
  assert.equal(
    controller.codexLinuxApplyAvatarInputShape({
      isDestroyed: () => false,
      getContentBounds: () => ({ x: 5743, y: 936, width: 356, height: 320 }),
      setShape() {
        throw new Error("unsupported");
      },
    }),
    false,
  );
});

test("keeps avatar overlay layout sync working after layout alias drift", () => {
  const source = avatarOverlayBundleFixture().replaceAll("r.windowBounds", "n.windowBounds");

  const patched = applyPatchTwice(applyLinuxAvatarOverlayMousePassthroughPatch, source);

  assert.match(
    patched,
    /this\.setWindowBounds\(e,n\.windowBounds\),this\.sendLayoutToRenderer\(e\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)\}getLayout\(e\)\{/,
  );
});

test("keeps avatar overlay interactivity working after native presentation drift", () => {
  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(
      applyLinuxAvatarOverlayMousePassthroughPatch,
      currentAvatarOverlayBundleFixture(),
    ),
  );

  assert.deepEqual(warnings, []);
  assert.match(patched, /this\.applyLatestElementSizes\(i\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)/);
  assert.match(patched, /this\.codexLinuxAvatarCompositorHintsApplied=!1,this\.codexLinuxAvatarCompositorHintsApplying=!1,this\.compositionHost\.setOverlayWindow\(t\)/);
  assert.match(patched, /this\.dragState=new h2\(i==null\?`renderer`:`native`,c,l,a\.screen\.getDisplayNearestPoint\(s\)\.bounds\),process\.platform===`linux`&&\(this\.pointerInteractive=!0,this\.applyPointerInteractivityPolicy\(\)\)/);
  assert.match(patched, /this\.dragState=null,this\.reclampWindowToVisibleDisplay\(\{shouldPersist:!0\}\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)/);
  assert.match(patched, /traySize:process\.platform===`linux`&&typeof this\.codexLinuxIsI3Session==`function`&&this\.codexLinuxIsI3Session\(\)\?this\.traySize:this\.traySize\?\?\(this\.layoutMode===`native`\?k2:O2\)/);
  assert.match(patched, /this\.setWindowBounds\(e,o\.windowBounds,n,r\),this\.sendLayoutToRenderer\(e,i\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\)/);
  assert.match(patched, /e\.moveTop\(\),e\.showInactive\(\),process\.platform===`linux`&&this\.codexLinuxApplyAvatarCompositorHints\(e\),process\.platform===`linux`&&this\.applyPointerInteractivityPolicy\(\),!t&&this\.isOpen\(\)&&\(this\.finishPendingPresentation\(\),this\.broadcastOpenState\(\)\)\}showWindowIfReady/);
  assert.match(patched, /this\.cancelMomentum\(\),this\.clearMovedWindowPersist\(\),this\.window=null/);
});

test("scopes avatar overlay method matching away from unrelated earlier classes", () => {
  const unrelatedClass =
    "var Unrelated=class{startDrag(e){this.dragState=null}endDrag(e){this.dragState=null,this.reclampWindowToVisibleDisplay({shouldPersist:!0})}showWindow(e){e.moveTop(),e.showInactive(),this.broadcastOpenState()}};";

  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(
      applyLinuxAvatarOverlayMousePassthroughPatch,
      `${unrelatedClass}${currentAvatarOverlayBundleFixture()}`,
    ),
  );

  assert.deepEqual(warnings, []);
  assert.match(
    patched,
    /var Unrelated=class\{startDrag\(e\)\{this\.dragState=null\}endDrag\(e\)\{this\.dragState=null,this\.reclampWindowToVisibleDisplay\(\{shouldPersist:!0\}\)\}showWindow\(e\)\{e\.moveTop\(\),e\.showInactive\(\),this\.broadcastOpenState\(\)\}\};/,
  );
  assert.match(
    patched,
    /this\.dragState=new h2\(i==null\?`renderer`:`native`,c,l,a\.screen\.getDisplayNearestPoint\(s\)\.bounds\),process\.platform===`linux`&&\(this\.pointerInteractive=!0,this\.applyPointerInteractivityPolicy\(\)\)/,
  );
});

test("bounds avatar overlay method matching to the overlay class body", () => {
  const unrelatedClass =
    "var Other=class{startDrag(e,t){this.dragState={fake:!0}}endDrag(e,t){this.dragState=null,this.reclampWindowToVisibleDisplay({shouldPersist:!0})}setElementSize(e,{mascot:t,tray:n}){this.applyLayout(e)}applyLayout(e){this.setWindowBounds(e,o.windowBounds),this.sendLayoutToRenderer(e)}showWindow(e){e.moveTop(),e.showInactive(),this.broadcastOpenState()}};";
  const source = currentAvatarOverlayBundleFixture().replace(
    "var h2=class",
    `${unrelatedClass}var h2=class`,
  );

  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(
      applyLinuxAvatarOverlayMousePassthroughPatch,
      source,
    ),
  );

  assert.deepEqual(warnings, []);
  assert.equal(patched.includes(unrelatedClass), true);
  assert.match(
    patched,
    /this\.dragState=new h2\(i==null\?`renderer`:`native`,c,l,a\.screen\.getDisplayNearestPoint\(s\)\.bounds\),process\.platform===`linux`&&\(this\.pointerInteractive=!0,this\.applyPointerInteractivityPolicy\(\)\)/,
  );
});

test("adds Linux window icon handling when an icon asset is available", () => {
  const iconAsset = "app-test.png";
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const windowOptionsSource = "...process.platform===`win32`?{autoHideMenuBar:!0}:{},";
  const readyToShowSource = "D.once(`ready-to-show`,()=>{})";

  const patchedWindowOptions = applyPatchTwice(
    applyLinuxWindowOptionsPatch,
    windowOptionsSource,
    iconAsset,
  );
  const patchedSetIcon = applyPatchTwice(applyLinuxSetIconPatch, readyToShowSource, iconAsset);
  const patchedMain = applyPatchTwice(
    patchMainBundleSource,
    [
      mainBundlePrefix,
      windowOptionsSource,
      "process.platform===`win32`&&k.removeMenu(),",
      readyToShowSource,
      alreadyOpaqueBackgroundBundle,
      fileManagerBundle,
      trayBundleFixture(),
      singleInstanceBundleFixture(),
    ].join(""),
    iconAsset,
  );

  assert.match(patchedWindowOptions, /process\.platform===`win32`\?\{autoHideMenuBar:!0\}:process\.platform===`linux`/);
  assert.doesNotMatch(patchedWindowOptions, /process\.platform===`win32`\|\|process\.platform===`linux`/);
  assert.match(patchedWindowOptions, new RegExp(`icon:${escapeRegExp(iconPathExpression)}`));
  assert.equal(
    patchedSetIcon,
    `process.platform===\`linux\`&&D.setIcon(${iconPathExpression}),${readyToShowSource}`,
  );
  assert.match(patchedMain, new RegExp(`icon:${escapeRegExp(iconPathExpression)}`));
  assert.doesNotMatch(patchedMain, /process\.platform===`win32`\|\|process\.platform===`linux`\?\{autoHideMenuBar:!0/);
  assert.match(patchedMain, new RegExp(`D\\.setIcon\\(${escapeRegExp(iconPathExpression)}\\)`));
});

test("adds Linux window icon handling to current Linux autoHideMenuBar options", () => {
  const iconAsset = "app-test.png";
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const windowOptionsSource =
    "...process.platform===`win32`||process.platform===`linux`?{autoHideMenuBar:!0}:{},";

  const patched = applyPatchTwice(applyLinuxWindowOptionsPatch, windowOptionsSource, iconAsset);

  assert.match(patched, /process\.platform===`win32`\?\{autoHideMenuBar:!0\}:process\.platform===`linux`/);
  assert.doesNotMatch(patched, /process\.platform===`win32`\|\|process\.platform===`linux`/);
  assert.match(patched, new RegExp(`icon:${escapeRegExp(iconPathExpression)}`));
});

test("omits undefined BrowserWindow options in the current window manager bundle", () => {
  const iconAsset = "app-test.png";
  const source = [
    "let M=new a.BrowserWindow({width:b,height:x,...S===void 0||C===void 0?{}:{x:S,y:C},",
    "title:n??a.app.getName(),backgroundColor:A,show:l,parent:p,focusable:m,",
    "...process.platform===`win32`?{autoHideMenuBar:!0}:process.platform===`linux`?{icon:process.resourcesPath+`/../content/webview/assets/app-test.png`}:{},",
    "backgroundMaterial:j??void 0,...D,minWidth:T?.width,minHeight:T?.height,webPreferences:k});",
  ].join("");

  const patched = applyPatchTwice(applyLinuxWindowOptionsPatch, source, iconAsset);

  assert.match(patched, /show:l,\.\.\.p==null\?\{\}:\{parent:p\},\.\.\.m==null\?\{\}:\{focusable:m\}/);
  assert.match(patched, /\.\.\.j==null\?\{\}:\{backgroundMaterial:j\},\.\.\.D,\.\.\.T==null\?\{\}:\{minWidth:T\.width,minHeight:T\.height\},webPreferences:k/);
  assert.doesNotMatch(patched, /show:l,parent:p,focusable:m/);
  assert.doesNotMatch(patched, /backgroundMaterial:j\?\?void 0/);
  assert.doesNotMatch(patched, /minWidth:T\?\.width/);
});

test("forces Linux primary BrowserWindow to be focusable", () => {
  const iconAsset = "app-test.png";
  const source = [
    "async createWindow(e={}){let{title:n,width:i=1280,height:o=820,appearance:c=`primary`,",
    "show:l=!0,parent:p,focusable:m}=e,D={},M=new a.BrowserWindow({width:b,height:x,",
    "...S===void 0||C===void 0?{}:{x:S,y:C},title:n??a.app.getName(),backgroundColor:A,",
    "show:l,parent:p,focusable:m,",
    "...process.platform===`win32`?{autoHideMenuBar:!0}:process.platform===`linux`?{icon:process.resourcesPath+`/../content/webview/assets/app-test.png`}:{},",
    "backgroundMaterial:j??void 0,...D,minWidth:T?.width,minHeight:T?.height,webPreferences:k});}",
  ].join("");

  const patched = applyPatchTwice(applyLinuxWindowOptionsPatch, source, iconAsset);

  assert.match(
    patched,
    /show:l,\.\.\.p==null\?\{\}:\{parent:p\},\.\.\.process\.platform===`linux`&&c===`primary`\?\{focusable:!0\}:m==null\?\{\}:\{focusable:m\}/,
  );
  assert.match(patched, /\.\.\.j==null\?\{\}:\{backgroundMaterial:j\},\.\.\.D/);
  assert.doesNotMatch(patched, /show:l,parent:p,focusable:m/);
});

test("forces Linux primary BrowserWindow to be focusable for current boolean minified shape", () => {
  const source = [
    "async createWindow(e={}){let{title:n,width:i=1280,height:o=820,appearance:c=`primary`}=e,",
    "M=new a.BrowserWindow({width:b,height:x,title:n??a.app.getName(),focusable:!1,",
    "webPreferences:k});}",
  ].join("");

  const patched = applyPatchTwice(applyLinuxWindowOptionsPatch, source, null);

  assert.match(
    patched,
    /focusable:process\.platform===`linux`&&c===`primary`\?!0:!1,webPreferences:k/,
  );
  assert.doesNotMatch(patched, /focusable:!1,webPreferences:k/);
});

test("keeps focusable destructuring valid while patching current boolean minified shape", () => {
  const source = [
    "async createWindow(e={}){let{title:n,width:i=1280,height:o=820,appearance:c=`primary`,",
    "focusable:m}=e,M=new a.BrowserWindow({width:b,height:x,focusable:!1,",
    "webPreferences:k});}",
  ].join("");

  const patched = applyPatchTwice(applyLinuxWindowOptionsPatch, source, null);

  assert.match(patched, /appearance:c=`primary`,focusable:m\}=e/);
  assert.match(
    patched,
    /new a\.BrowserWindow\(\{width:b,height:x,focusable:process\.platform===`linux`&&c===`primary`\?!0:!1,/,
  );
});

test("fails loudly when primary BrowserWindow focusable shape cannot be patched", () => {
  const source = [
    "async createWindow(e={}){let{appearance:c=`primary`}=e,",
    "M=new a.BrowserWindow({width:b,height:x,focusable:getFocusable(),webPreferences:k});}",
  ].join("");

  assert.throws(
    () => applyLinuxWindowOptionsPatch(source, null),
    /Could not patch primary BrowserWindow focusable option for Linux/,
  );
});

test("patches remaining Linux window icon snippets when another window is already patched", () => {
  const iconAsset = "app-test.png";
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const windowOptionsSource = "...process.platform===`win32`?{autoHideMenuBar:!0}:{},";
  const patchedWindowOptionsNeedle =
    `...process.platform===\`win32\`?{autoHideMenuBar:!0}:process.platform===\`linux\`?{icon:${iconPathExpression}}:{},`;
  const readyToShowSource = "D.once(`ready-to-show`,()=>{})";
  const readyToShowSource2 = "E.once(`ready-to-show`,()=>{})";
  const patchedSetIconNeedle =
    `process.platform===\`linux\`&&D.setIcon(${iconPathExpression}),${readyToShowSource}`;

  const patchedWindowOptions = applyPatchTwice(
    applyLinuxWindowOptionsPatch,
    `${patchedWindowOptionsNeedle}function createSecondWindow(){return {${windowOptionsSource}}}`,
    iconAsset,
  );
  const patchedSetIcon = applyPatchTwice(
    applyLinuxSetIconPatch,
    `${patchedSetIconNeedle}function createSecondWindow(){${readyToShowSource2}}`,
    iconAsset,
  );

  assert.equal((patchedWindowOptions.match(/icon:process\.resourcesPath/g) ?? []).length, 2);
  assert.match(
    patchedWindowOptions,
    /function createSecondWindow\(\)\{return \{\.\.\.process\.platform===`win32`\?\{autoHideMenuBar:!0\}:process\.platform===`linux`\?\{icon:process\.resourcesPath\+`\/\.\.\/content\/webview\/assets\/app-test\.png`\}:\{\},\}\}/,
  );
  assert.equal((patchedSetIcon.match(/\.setIcon\(/g) ?? []).length, 2);
  assert.match(
    patchedSetIcon,
    /function createSecondWindow\(\)\{process\.platform===`linux`&&E\.setIcon\(process\.resourcesPath\+`\/\.\.\/content\/webview\/assets\/app-test\.png`\),E\.once\(`ready-to-show`,\(\)=>\{\}\)\}/,
  );
});

test("recognizes current Linux setIcon coverage as window icon handling", () => {
  const iconAsset = "app-test.png";
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const source = `process.platform===\`linux\`&&D.setIcon(${iconPathExpression}),D.once(\`ready-to-show\`,()=>{})`;

  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(applyLinuxWindowOptionsPatch, source, iconAsset),
  );

  assert.equal(patched, source);
  assert.deepEqual(warnings, []);
});

test("lets ready-to-show icon insertion cover current window options drift", () => {
  const iconAsset = "app-test.png";
  const source = "D.once(`ready-to-show`,()=>{})";

  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(applyLinuxWindowOptionsPatch, source, iconAsset),
  );

  assert.equal(patched, source);
  assert.deepEqual(warnings, []);
});

test("adds Linux tray support including the platform guard", () => {
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const packagedTrayIconPathExpression = "process.resourcesPath+`/../.codex-linux/`+(process.env.CODEX_LINUX_APP_ID??`chatgpt-desktop`)+`-tray.png`";
  const packagedAppIconPathExpression = "process.resourcesPath+`/../.codex-linux/`+(process.env.CODEX_LINUX_APP_ID??`chatgpt-desktop`)+`.png`";
  const patched = applyPatchTwice(applyLinuxTrayPatch, trayBundleFixture(), iconPathExpression);

  assert.match(
    patched,
    /process\.platform!==`win32`&&process\.platform!==`darwin`&&process\.platform!==`linux`\?null:/,
  );
  assert.match(
    patched,
    new RegExp(`nativeImage\\.createFromPath\\(${escapeRegExp(packagedTrayIconPathExpression)}\\)`),
  );
  assert.match(
    patched,
    new RegExp(`nativeImage\\.createFromPath\\(${escapeRegExp(packagedAppIconPathExpression)}\\)`),
  );
  assert.match(
    patched,
    new RegExp(`nativeImage\\.createFromPath\\(${escapeRegExp(iconPathExpression)}\\)`),
  );
  assert.match(
    patched,
    /\(process\.platform===`win32`\|\|process\.platform===`linux`\)&&!this\.isAppQuitting&&!\(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress\(\)\)/,
  );
  assert.match(patched, /setLinuxTrayContextMenu\(\)\{let e=n\.Menu\.buildFromTemplate/);
  assert.match(
    patched,
    /process\.platform===`linux`&&this\.setLinuxTrayContextMenu\(\),this\.tray\.on\(`click`/,
  );
  assert.match(
    patched,
    /openNativeTrayMenu\(\)\{if\(process\.platform===`linux`&&\(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress\(\)\)\)return;/,
  );
  assert.match(patched, /if\(process\.platform===`linux`\)return;e\.once\(`menu-will-show`/);
  assert.match(
    patched,
    /this\.trayMenuThreads=e\.trayMenuThreads,process\.platform===`linux`&&!\(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress\(\)\)&&this\.setLinuxTrayContextMenu\?\.\(\)/,
  );
  assert.match(
    patched,
    /\(E\|\|process\.platform===`linux`&&\(typeof codexLinuxIsTrayEnabled!==`function`\|\|codexLinuxIsTrayEnabled\(\)\)\)&&oe\(\);/,
  );
  assert.doesNotMatch(patched, /process\.platform===`linux`&&codexLinuxIsTrayEnabled\(\)/);
});

test("uses collision-proof Linux tray icon variables when Electron alias is r", () => {
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const source = [
    "let r=require(`electron`),i=require(`node:path`);",
    "async function Hw(e){return process.platform!==`win32`&&process.platform!==`darwin`?null:(zw=!0,Lw??Rw??(Rw=(async()=>{let t=await Ww(e.buildFlavor,e.repoRoot),i=new r.Tray(t.defaultIcon);return i})()))}",
    "async function Ww(e,t){if(process.platform===`darwin`){return null}let n=process.platform===`win32`?`.ico`:`.png`,a=Nw(e,process.platform),o=[...r.app.isPackaged?[(0,i.join)(process.resourcesPath,`${a}${n}`)]:[],(0,i.join)(t,`electron`,`src`,`icons`,`${a}${n}`)];for(let e of o){let t=r.nativeImage.createFromPath(e);if(!t.isEmpty())return{defaultIcon:t,chronicleRunningIcon:null}}return{defaultIcon:await r.app.getFileIcon(process.execPath,{size:process.platform===`win32`?`small`:`normal`}),chronicleRunningIcon:null}}",
  ].join("");

  const patched = applyPatchTwice(applyLinuxTrayPatch, source, iconPathExpression);

  assert.doesNotMatch(patched, /let r=r\.nativeImage/);
  assert.match(
    patched,
    /let __codexLinuxUpstreamTrayIcon=r\.nativeImage\.createFromPath\(process\.resourcesPath\+`\/\.\.\/content\/webview\/assets\/app-test\.png`\)/,
  );
});

test("adds Linux tray icon fallback when current upstream uses small file icon fallback", () => {
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const source = trayBundleFixture().replace(
    "n.app.getFileIcon(process.execPath,{size:process.platform===`win32`?`small`:`normal`})",
    "n.app.getFileIcon(process.execPath,{size:`small`})",
  );

  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(applyLinuxTrayPatch, source, iconPathExpression),
  );

  assert.deepEqual(warnings, []);
  assert.match(patched, /__codexLinuxTrayIcon=n\.nativeImage\.createFromPath/);
  assert.match(patched, /n\.app\.getFileIcon\(process\.execPath,\{size:`small`\}\)/);
});

test("adds Linux tray support even when About dialog already uses the bundled icon path", () => {
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const packagedTrayIconPathExpression = "process.resourcesPath+`/../.codex-linux/`+(process.env.CODEX_LINUX_APP_ID??`chatgpt-desktop`)+`-tray.png`";
  const source = [
    trayBundleFixture(),
    "async function bZ(){let t=process.execPath;return process.platform===`linux`?Promise.resolve((()=>{let __codexLinuxAboutIcon=n.nativeImage.createFromPath(process.resourcesPath+`/../content/webview/assets/app-test.png`);return __codexLinuxAboutIcon.isEmpty()?null:__codexLinuxAboutIcon})()):n.app.getFileIcon(t,{size:process.platform===`win32`?`large`:`normal`}).catch(()=>null)}",
  ].join("");

  const patched = applyPatchTwice(applyLinuxTrayPatch, source, iconPathExpression);

  assert.match(
    patched,
    new RegExp(`nativeImage\\.createFromPath\\(${escapeRegExp(packagedTrayIconPathExpression)}\\)`),
  );
});

test("adds Linux build information to the tray menu", () => {
  const patched = applyPatchTwice(applyLinuxBuildInfoTrayPatch, `${mainBundlePrefix}${trayBundleFixture()}`);

  assert.match(patched, /function codexLinuxShowBuildInfo\(\)/);
  assert.match(patched, /codex-linux-build-info\.json/);
  assert.match(patched, /label:`Build Information`,click:\(\)=>\{codexLinuxShowBuildInfo\(\)\}/);
  assert.match(patched, /Enabled features:/);
  assert.match(patched, /Upstream DMG SHA256:/);
  assert.match(patched, /Linux source commit:/);
  assert.match(patched, /Source commit URL:/);
  assert.match(patched, /Open Source Commit/);
  assert.match(patched, /Open Metadata File/);
  assert.match(patched, /shell\?\.openExternal/);
  assert.match(patched, /shell\?\.openPath/);
});

test("adds Linux build information request handlers for renderer settings", () => {
  const source =
    "let n=require(`electron`),o=require(`node:fs`),i=require(`node:path`),e={bn:{help:`help`}};const h={\"get-global-state\":async({key:a})=>({value:this.globalState.get(a)}),\"set-global-state\":async({key:a,value:b,origin:c})=>(this.setGlobalStateValue(a,b,c),{success:!0})};let $e=[{role:`help`,id:e.bn.help,submenu:[{label:`Codex Documentation`,click:()=>{n.shell.openExternal(`https://developers.openai.com/codex/app`)}}]}],et=n.Menu.buildFromTemplate($e);n.Menu.setApplicationMenu(et);";
  const patched = applyPatchTwice(applyLinuxBuildInfoTrayPatch, source);

  assert.match(patched, /function codexLinuxGetBuildInfo\(\)/);
  assert.match(patched, /"codex-linux-get-build-info":async\(\)=>codexLinuxGetBuildInfo\(\)/);
  assert.match(
    patched,
    /"codex-linux-open-build-info-commit":async\(\)=>codexLinuxOpenBuildInfoCommit\(\)/,
  );
  assert.match(
    patched,
    /"codex-linux-show-build-info":async\(\)=>\{await codexLinuxShowBuildInfo\(\);return\{success:!0\}\}/,
  );
});

test("Linux build information helper locals do not shadow minified module bindings", () => {
  const source =
    "let a=require(`electron`),l=require(`node:fs`),s=require(`node:path`),e={bn:{help:`help`}};const h={\"get-global-state\":async({key:a})=>({value:this.globalState.get(a)}),\"set-global-state\":async({key:a,value:b,origin:c})=>(this.setGlobalStateValue(a,b,c),{success:!0})};let $e=[{role:`help`,id:e.bn.help,submenu:[{label:`Codex Documentation`,click:()=>{a.shell.openExternal(`https://developers.openai.com/codex/app`)}}]}],et=a.Menu.buildFromTemplate($e);a.Menu.setApplicationMenu(et);";
  const patched = applyPatchTwice(applyLinuxBuildInfoTrayPatch, source);

  assert.match(patched, /await a\.dialog\?\.showMessageBox/);
  assert.match(patched, /\(0,s\.join\)\(process\.resourcesPath/);
  assert.match(patched, /l\.existsSync\(__codexBuildInfoPath\)/);
  assert.doesNotMatch(patched, /let a=await a\.dialog/);
  assert.doesNotMatch(patched, /let s=\[\]/);
});

test("Linux build information request handlers are inserted into the handler table", () => {
  const source =
    "let a=require(`electron`),l=require(`node:fs`),s=require(`node:path`),e={bn:{help:`help`}};const h={\"is-copilot-api-available\":async()=>({available:!1}),\"get-global-state\":async({key:e})=>({value:this.globalState.get(e)}),\"set-global-state\":async({key:e,value:t,origin:n})=>(this.setGlobalStateValue(e,t,n),{success:!0})};let $e=[{role:`help`,id:e.bn.help,submenu:[{label:`Codex Documentation`,click:()=>{a.shell.openExternal(`https://developers.openai.com/codex/app`)}}]}],et=a.Menu.buildFromTemplate($e);a.Menu.setApplicationMenu(et);";
  const patched = applyPatchTwice(applyLinuxBuildInfoTrayPatch, source);

  assert.match(
    patched,
    /"is-copilot-api-available":async\(\)=>\(\{available:!1\}\),"codex-linux-get-build-info":async\(\)=>codexLinuxGetBuildInfo\(\),"codex-linux-open-build-info-commit"/,
  );
  assert.doesNotMatch(patched, /"is-copilot-api-available":async\(\)=>\(\{"codex-linux-get-build-info"/);
});

test("adds Linux build information to current tray menu shape", () => {
  const patched = applyPatchTwice(applyLinuxBuildInfoTrayPatch, `${mainBundlePrefix}${currentTrayMenuBundleFixture()}`);

  assert.match(patched, /function codexLinuxShowBuildInfo\(\)/);
  assert.match(
    patched,
    /getNativeTrayMenuItems\(\)\{let\{pinnedThreads:e,[^]*?;return\[\.\.\.process\.platform===`linux`\?\[\{label:`Build Information`,click:\(\)=>\{codexLinuxShowBuildInfo\(\)\}\},\{type:`separator`\}\]:\[\],\.\.\.h/,
  );
});

test("adds Linux build information to the app Help menu", () => {
  const source =
    "let n=require(`electron`),o=require(`node:fs`),i=require(`node:path`),e={bn:{help:`help`}};let $e=[{role:`help`,id:e.bn.help,submenu:[{label:`Codex Documentation`,click:()=>{n.shell.openExternal(`https://developers.openai.com/codex/app`)}}]}],et=n.Menu.buildFromTemplate($e);n.Menu.setApplicationMenu(et);";
  const patched = applyPatchTwice(applyLinuxBuildInfoTrayPatch, source);

  assert.match(patched, /function codexLinuxShowBuildInfo\(\)/);
  assert.doesNotThrow(() => new Function(patched));
  assert.match(
    patched,
    /\{role:`help`,id:e\.bn\.help,submenu:\[\.\.\.process\.platform===`linux`\?\[\{label:`Build Information`,click:\(\)=>\{codexLinuxShowBuildInfo\(\)\}\},\{type:`separator`\}\]:\[\],\{label:`Codex Documentation`/,
  );
});

test("makes About dialog prefer the bundled Linux icon asset", () => {
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const source = [
    "let a=require(`electron`),r={T:()=>null,V:()=>({formatMessage:({defaultMessage:e})=>e})},t={dt:()=>null,Kr:()=>null};",
    "var $X=`codex.aboutDialog.title`,eZ=`About {appName}`,tZ=`codex.aboutDialog.ok`,nZ=`codex.aboutDialog.versionLine`,rZ=`Version {version}`,iZ=`codex.aboutDialog.versionLineWithDate`,aZ=`Version {version} • Released {releaseDate}`,oZ=`codex.aboutDialog.buildInfoLabel`,sZ=`Build information`,cZ=380,lZ=360,uZ=72,pZ=null;",
    "async function bZ(){let e=process.platform===`darwin`,t=e?r.T():process.execPath,[n,i]=await Promise.all([e?Fw(t):null,a.app.getFileIcon(t,{size:process.platform===`win32`?`large`:`normal`})]);return{htmlIconDataUrl:n??(i.isEmpty()?null:i.resize({width:uZ,height:uZ,quality:`best`}).toDataURL()),windowIcon:i}}",
    "let d={windowIcon:null},q={...d.windowIcon.isEmpty()?{}:{icon:d.windowIcon}};",
  ].join("");

  const patched = applyPatchTwice(applyLinuxAboutDialogPatch, source, iconPathExpression);

  assert.match(
    patched,
    new RegExp(`nativeImage\\.createFromPath\\(${escapeRegExp(iconPathExpression)}\\)`),
  );
  assert.match(patched, /process\.platform===`linux`\?null:e\?Fw\(t\):null/);
  assert.match(patched, /windowIcon==null\|\|d\.windowIcon\.isEmpty\(\)\?\{\}:\{icon:d\.windowIcon\}/);
  assert.match(patched, /i==null\|\|i\.isEmpty\(\)\?null:i\.resize\(/);
  assert.match(patched, /windowIcon:i\?\?null/);
  assert.doesNotThrow(() => new Function(patched));
});

test("upgrades partially patched About dialog icon fallbacks after alias drift", () => {
  const iconPathExpression = "process.resourcesPath+`/../content/webview/assets/app-test.png`";
  const source = [
    "let r=require(`electron`),n={T:()=>null};",
    "var UZ=`codex.aboutDialog.title`,eQ=72;",
    "async function dQ(){let e=process.platform===`darwin`,t=e?n.T():process.execPath,[i,a]=await Promise.all([",
    "process.platform===`linux`?null:e?tT(t):null,",
    "process.platform===`linux`?Promise.resolve((()=>{let __codexLinuxAboutIcon=r.nativeImage.createFromPath(process.resourcesPath+`/../content/webview/assets/app-test.png`);return __codexLinuxAboutIcon.isEmpty()?null:__codexLinuxAboutIcon})()):r.app.getFileIcon(t,{size:process.platform===`win32`?`large`:`normal`}).catch(()=>null)",
    "]);return{htmlIconDataUrl:i??(a.isEmpty()?null:a.resize({width:eQ,height:eQ,quality:`best`}).toDataURL()),windowIcon:a}}",
    "let f={windowIcon:null},x={...f.windowIcon.isEmpty()?{}:{icon:f.windowIcon}};",
  ].join("");
  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(applyLinuxAboutDialogPatch, source, iconPathExpression),
  );

  assert.deepEqual(warnings, []);
  assert.match(patched, /a==null\|\|a\.isEmpty\(\)\?null:a\.resize\(/);
  assert.match(patched, /windowIcon:a\?\?null/);
  assert.match(patched, /f\.windowIcon==null\|\|f\.windowIcon\.isEmpty\(\)\?\{\}:\{icon:f\.windowIcon\}/);
});

test("adds Linux tray support for current minified window and startup identifiers", () => {
  const source = [
    "v&&j.on(`close`,e=>{this.persistPrimaryWindowBounds(j,f);let t=this.getPrimaryWindows(f).some(e=>e!==j);if(process.platform===`win32`&&!this.isAppQuitting&&this.options.canHideLastLocalWindowToTray?.()===!0&&!t){e.preventDefault(),j.hide();return}});",
    "async function eN(e){let t=await Ww(e.buildFlavor,e.repoRoot),r=new n.Tray(t.defaultIcon);return r}",
    "let ce$=async()=>{O=!0;try{await eN({buildFlavor:a,repoRoot:j.repoRoot})}catch(e){O=!1}};E&&ce$();",
  ].join("");

  const patched = applyPatchTwice(applyLinuxTrayPatch, source, null);

  assert.match(
    patched,
    /\(process\.platform===`win32`\|\|process\.platform===`linux`\)&&!this\.isAppQuitting&&!\(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress\(\)\)/,
  );
  assert.match(patched, /e\.preventDefault\(\),j\.hide\(\);return/);
  assert.match(
    patched,
    /\(E\|\|process\.platform===`linux`&&\(typeof codexLinuxIsTrayEnabled!==`function`\|\|codexLinuxIsTrayEnabled\(\)\)\)&&ce\$\(\);/,
  );
  assert.match(
    patched,
    /catch\(e\)\{O=!1;process\.platform===`linux`&&console\.warn\(`\[codex-linux\] Failed to set up system tray`,e\)\}/,
  );
  assert.equal((patched.match(/\[codex-linux\] Failed to set up system tray/g) ?? []).length, 1);
});

test("adds Linux tray startup support for current appBrand initializer", () => {
  const source = [
    "async function H5(e){let t=await W5(e.appBrand,e.repoRoot),n=new a.Tray(t.defaultIcon);return n}",
    "let ye=async()=>{O=!0;try{await H5({appBrand:r.et(),repoRoot:j.repoRoot})}catch(e){O=!1,_.reportNonFatal(e instanceof Error?e:`Failed to set up tray`,{kind:`tray-setup-failed`,tags:{errorType:`tray-setup-failed`}}),ee()}};E&&ye();",
  ].join("");

  const { value: patched, warnings } = captureWarns(() =>
    applyPatchTwice(applyLinuxTrayPatch, source, null),
  );

  assert.deepEqual(warnings.filter((warning) => warning.includes("tray startup")), []);
  assert.match(
    patched,
    /\(E\|\|process\.platform===`linux`&&\(typeof codexLinuxIsTrayEnabled!==`function`\|\|codexLinuxIsTrayEnabled\(\)\)\)&&ye\(\);/,
  );
  assert.match(
    patched,
    /ee\(\);process\.platform===`linux`&&console\.warn\(`\[codex-linux\] Failed to set up system tray`,e\)\}/,
  );
});

test("scopes dynamic tray startup matching to the tray initializer", () => {
  const source = [
    "async function aa(e){return e.buildFlavor}",
    "let startOther=async()=>{A=!0;try{await aa({buildFlavor:a})}catch(e){A=!1}};U&&startOther();",
    "async function eN(e){let t=await Ww(e.buildFlavor,e.repoRoot),r=new n.Tray(t.defaultIcon);return r}",
    "let ce$=async()=>{O=!0;try{await eN({buildFlavor:a,repoRoot:j.repoRoot})}catch(e){O=!1}};E&&ce$();",
  ].join("");

  const patched = applyPatchTwice(applyLinuxTrayPatch, source, null);

  assert.match(patched, /U&&startOther\(\);/);
  assert.doesNotMatch(
    patched,
    /\(U\|\|process\.platform===`linux`&&\(typeof codexLinuxIsTrayEnabled!==`function`\|\|codexLinuxIsTrayEnabled\(\)\)\)&&startOther\(\);/,
  );
  assert.match(
    patched,
    /\(E\|\|process\.platform===`linux`&&\(typeof codexLinuxIsTrayEnabled!==`function`\|\|codexLinuxIsTrayEnabled\(\)\)\)&&ce\$\(\);/,
  );
  assert.match(patched, /catch\(e\)\{A=!1\}\};U&&startOther\(\);/);
  assert.match(
    patched,
    /catch\(e\)\{O=!1;process\.platform===`linux`&&console\.warn\(`\[codex-linux\] Failed to set up system tray`,e\)\}/,
  );
});

test("migrates Linux tray startup patch to tolerate missing settings helper", () => {
  const source = [
    "async function eN(e){let t=await Ww(e.buildFlavor,e.repoRoot),r=new n.Tray(t.defaultIcon);return r}",
    "let ce$=async()=>{O=!0;try{await eN({buildFlavor:a,repoRoot:j.repoRoot})}catch(e){O=!1}};(E||process.platform===`linux`&&codexLinuxIsTrayEnabled())&&ce$();",
  ].join("");

  const patched = applyPatchTwice(applyLinuxTrayPatch, source, null);

  assert.match(
    patched,
    /\(E\|\|process\.platform===`linux`&&\(typeof codexLinuxIsTrayEnabled!==`function`\|\|codexLinuxIsTrayEnabled\(\)\)\)&&ce\$\(\);/,
  );
  assert.match(
    patched,
    /catch\(e\)\{O=!1;process\.platform===`linux`&&console\.warn\(`\[codex-linux\] Failed to set up system tray`,e\)\}/,
  );
});

test("logs Linux tray setup failures when the catch body contains nested objects", () => {
  const source = [
    "async function s4(e){let t=await l4(e.buildFlavor,e.repoRoot),n=new a.Tray(t.defaultIcon);return n}",
    "let _e=async()=>{k=!0;try{await s4({buildFlavor:o,repoRoot:M.repoRoot})}catch(e){k=!1,v.reportNonFatal(e instanceof Error?e:`Failed to set up tray`,{kind:`tray-setup-failed`,tags:{errorType:`tray-setup-failed`}}),N.ensureWindow()}};D&&_e();",
  ].join("");

  const patched = applyPatchTwice(applyLinuxTrayPatch, source, null);

  assert.match(
  