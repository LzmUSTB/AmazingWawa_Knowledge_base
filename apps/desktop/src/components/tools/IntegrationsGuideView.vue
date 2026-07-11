<script setup>
import AppIcon from "../ui/AppIcon.vue";

defineEmits(["close"]);

const skillSteps = [
  ["1", "Install", "Run the installer from Kinjito-Integrations. It copies the Skill to ~/.agents/skills/kinjito without administrator permission."],
  ["2", "Invoke", "Ask Codex to use Kinjito to inspect the current Vault, import knowledge from this conversation, create one note, or create one ExerciseSet."],
  ["3", "Review", "Kinjito reads the latest Vault, searches for duplicates, and returns a plan. Approve the plan before any write."],
  ["4", "Validate", "The proposal must pass @kinjito/protocol validation. A .wawapkg is built only when explicitly requested."],
];

const pluginSteps = [
  ["1", "Connect", "Add the deployed Kinjito MCP HTTPS endpoint to the client and finish OAuth authorization for a selected Vault repository."],
  ["2", "Preview", "Use workspace, context, search, and validate tools first. Keep the returned branch HEAD SHA for the reviewed proposal."],
  ["3", "Create PR", "After approval, call the import Pull Request tool with expectedHeadSha. A stale SHA is rejected."],
  ["4", "Merge", "Review the generated branch and Pull Request on GitHub. Remote tools never write directly to the default branch."],
];
</script>

<template>
  <section class="guide-view technical-grid">
    <header class="guide-header">
      <div class="guide-heading">
        <AppIcon name="tools" :size="24" />
        <div>
          <div class="panel-label" style="--label-color: var(--tools)">Integrations</div>
          <h1>Skills &amp; Plugins</h1>
          <p>如何安装、调用并安全地使用 Kinjito Agent Skill 与远程 MCP Plugin。</p>
        </div>
      </div>
      <button class="hud-button button-with-icon" type="button" @click="$emit('close')">
        <AppIcon name="chevron-left" :size="13" />
        <span>Back to Tools</span>
      </button>
    </header>

    <main class="guide-content">
      <section class="intro-band">
        <div>
          <span class="section-label">Choose the integration</span>
          <strong>Skill = local Codex workflow</strong>
          <p>读取桌面端写入的 <code>~/.kinjito/config.json</code>，在本机提供上下文、查重、校验与显式 package 输出。</p>
        </div>
        <div>
          <span class="section-label">Remote collaboration</span>
          <strong>Plugin / MCP = GitHub reviewed workflow</strong>
          <p>从最新 commit 读取 Vault；远程写入只创建新分支与 Pull Request，不直接修改默认分支。</p>
        </div>
      </section>

      <section class="guide-card">
        <header>
          <span class="guide-card__icon"><AppIcon name="file-plus" :size="20" /></span>
          <div><span class="section-label">Local Codex</span><h2>Agent Skill</h2></div>
        </header>
        <div class="command-grid">
          <div><span>Windows install</span><code>.\scripts\install-skill.ps1</code></div>
          <div><span>macOS / Linux install</span><code>./scripts/install-skill.sh</code></div>
          <div><span>Windows uninstall</span><code>.\scripts\uninstall-skill.ps1</code></div>
          <div><span>macOS / Linux uninstall</span><code>./scripts/uninstall-skill.sh</code></div>
        </div>
        <ol class="step-list">
          <li v-for="step in skillSteps" :key="step[0]"><b>{{ step[0] }}</b><div><strong>{{ step[1] }}</strong><p>{{ step[2] }}</p></div></li>
        </ol>
        <div class="prompt-box">
          <span>Example prompts</span>
          <code>使用 Kinjito 检查当前 Vault，先给出这段对话的知识导入计划。</code>
          <code>使用 Kinjito 为 &lt;node-id&gt; 创建一个 practice ExerciseSet，先验证，不要直接写入。</code>
        </div>
      </section>

      <section class="guide-card">
        <header>
          <span class="guide-card__icon"><AppIcon name="git-branch" :size="20" /></span>
          <div><span class="section-label">ChatGPT / remote clients</span><h2>Plugin &amp; MCP</h2></div>
        </header>
        <ol class="step-list">
          <li v-for="step in pluginSteps" :key="step[0]"><b>{{ step[0] }}</b><div><strong>{{ step[1] }}</strong><p>{{ step[2] }}</p></div></li>
        </ol>
        <div class="tool-flow" aria-label="MCP tool flow">
          <code>get_workspace_state</code><span>→</span><code>get_authoring_context</code><span>→</span><code>search_knowledge</code><span>→</span><code>validate_proposal</code><span>→</span><code>create_import_pull_request</code>
        </div>
      </section>

      <section class="safety-card">
        <span class="safety-icon"><AppIcon name="check" :size="20" /></span>
        <div>
          <span class="section-label">Required safety gates</span>
          <h2>Always preview before write</h2>
          <ul>
            <li>每次调用都重新读取最新 Vault / branch HEAD，不依赖旧 context export。</li>
            <li>先查重、再计划、再校验；用户批准后才创建文件或 Pull Request。</li>
            <li>默认一次只处理一个 note 或一个 ExerciseSet。</li>
            <li>其他 ChatGPT 对话不会被自动读取；必须在来源对话调用或显式提供内容。</li>
            <li>Skill、Plugin、配置模板和日志中不得存放 token、私钥或完整私密笔记。</li>
          </ul>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.guide-view { display: grid; grid-template-rows: auto minmax(0, 1fr); width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; background: var(--background-main); }
.guide-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 92px; border-bottom: 1px solid var(--border-muted); background: var(--background-panel); padding: 16px 20px; }
.guide-heading { display: flex; align-items: flex-start; gap: 14px; color: var(--tools); }
.guide-heading h1, .guide-card h2, .safety-card h2 { margin: 5px 0 0; color: var(--text-primary); text-transform: uppercase; }
.guide-heading h1 { font-size: var(--font-size-title); }
.guide-heading p { margin: 7px 0 0; color: var(--text-secondary); }
.guide-content { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 14px; overflow: auto; padding: 18px; }
.intro-band, .guide-card, .safety-card { border: 1px solid var(--border-primary); background: var(--background-panel); }
.intro-band { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-left: 5px solid var(--tools); }
.intro-band > div { padding: 18px; }
.intro-band > div + div { border-left: 1px solid var(--border-muted); }
.intro-band strong { display: block; margin-top: 8px; color: var(--text-primary); text-transform: uppercase; }
.intro-band p, .step-list p { margin: 7px 0 0; color: var(--text-secondary); line-height: 1.55; }
.intro-band code { color: var(--tools); }
.guide-card { border-left: 5px solid var(--tools); padding: 18px; }
.guide-card > header { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-muted); padding-bottom: 14px; }
.guide-card__icon, .safety-icon { display: grid; place-items: center; flex: 0 0 40px; width: 40px; height: 40px; border: 1px solid var(--tools); color: var(--tools); }
.section-label { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.command-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.command-grid div, .prompt-box { display: grid; gap: 7px; border: 1px solid var(--border-muted); background: var(--background-main); padding: 10px; }
.command-grid span, .prompt-box > span { color: var(--text-muted); font-size: var(--font-size-small); font-weight: 800; text-transform: uppercase; }
.command-grid code, .prompt-box code, .tool-flow code { overflow-wrap: anywhere; color: var(--tools); font-family: var(--font-mono); font-size: var(--font-size-small); }
.step-list { display: grid; gap: 0; margin: 16px 0 0; padding: 0; list-style: none; }
.step-list li { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; border-top: 1px solid var(--border-muted); padding: 12px 0; }
.step-list li > b { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--tools); color: var(--tools); }
.step-list strong { color: var(--text-primary); text-transform: uppercase; }
.prompt-box { margin-top: 12px; }
.tool-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; border-top: 1px solid var(--border-muted); margin-top: 10px; padding-top: 14px; }
.tool-flow span { color: var(--text-muted); }
.safety-card { grid-column: 1 / -1; display: flex; gap: 14px; border-left: 5px solid var(--career); padding: 18px; }
.safety-card .safety-icon { border-color: var(--career); color: var(--career); }
.safety-card ul { margin: 12px 0 0; padding-left: 18px; color: var(--text-secondary); line-height: 1.7; }
@media (max-width: 1040px) { .guide-content, .intro-band { grid-template-columns: 1fr; }.intro-band > div + div { border-top: 1px solid var(--border-muted); border-left: 0; }.guide-card, .safety-card { grid-column: 1; }.command-grid { grid-template-columns: 1fr; } }
@media (max-width: 720px) { .guide-header { align-items: stretch; flex-direction: column; }.guide-content { padding: 12px; } }
</style>
