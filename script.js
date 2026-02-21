const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function animateCount(el, toValue, duration = 700) {
  const fromValue = 0;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(fromValue + (toValue - fromValue) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function formatCategory(cat) {
  if (cat === "graduacao") return "Graduação";
  if (cat === "pos") return "Pós";
  if (cat === "cursos") return "Cursos Livres";
  return "Outros";
}

function isPdf(type, file) {
  if (type === "pdf") return true;
  return (file || "").toLowerCase().endsWith(".pdf");
}

/* Theme toggle */
const themeToggle = $("#themeToggle");
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") document.body.classList.add("light");

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("light") ? "light" : "dark",
  );
});

/* Footer year */
$("#year").textContent = new Date().getFullYear();

/* Copy email */
$("#copyEmail")?.addEventListener("click", async () => {
  const email = $("#emailText").textContent.trim();
  try {
    await navigator.clipboard.writeText(email);
    $("#copyMsg").textContent = "E-mail copiado ✅";
    setTimeout(() => ($("#copyMsg").textContent = ""), 1800);
  } catch {
    $("#copyMsg").textContent =
      "Não consegui copiar automaticamente. Selecione e copie.";
  }
});

/* Stats */
function initStats() {
  const stats = $$(".stat-num");
  stats.forEach((el) => {
    const to = Number(el.getAttribute("data-count") || "0");
    animateCount(el, to, 800);
  });
}
initStats();

/* FORMAÇÕES */
const coursesList = $("#coursesList");
const preview = $("#preview");
const tabs = $$(".tab");
const certCounter = $("#certCounter");

let allFormacoes = [];
let currentCategory = "graduacao";

function setActiveCourse(element) {
  $$(".course-item").forEach((i) => i.classList.remove("active"));
  element.classList.add("active");
}

function renderPreviewFormacao(item) {
  const frameContent = isPdf(item.type, item.arquivo)
    ? `<iframe src="${item.arquivo}" title="Certificado: ${item.titulo}"></iframe>`
    : `<img src="${item.arquivo}" alt="Certificado: ${item.titulo}" />`;

  preview.innerHTML = `
    <h3>${item.icon || "📄"} ${item.titulo}</h3>

    <div class="preview-info">
      <div class="info-chip"><span>Instituição</span>${item.instituicao}</div>
      <div class="info-chip"><span>Carga horária</span>${item.carga}</div>
      <div class="info-chip"><span>Ano/Data</span>${item.data}</div>
      <div class="info-chip"><span>Categoria</span>${formatCategory(item.category)}</div>
    </div>

    <div class="preview-actions">
      <a class="btn primary" href="${item.arquivo}" target="_blank" rel="noopener">🔎 Abrir em nova aba</a>
      <a class="btn" href="${item.arquivo}" download>⬇️ Baixar</a>
    </div>

    <div class="preview-frame">
      ${frameContent}
    </div>
  `;
}

function renderFormacoesList(category) {
  coursesList.innerHTML = "";

  const filtered =
    category === "all"
      ? allFormacoes
      : allFormacoes.filter((item) => item.category === category);

  animateCount(certCounter, filtered.length);

  if (filtered.length === 0) {
    coursesList.innerHTML = `<p class="muted" style="padding:10px;">Nenhum item nessa categoria.</p>`;
    preview.innerHTML = `
      <div class="preview-empty">
        <h3>Nada aqui ainda</h3>
        <p>Adicione itens no <strong>data/formacoes.json</strong>.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "course-item";
    card.innerHTML = `
      <div class="course-icon">${item.icon || "📄"}</div>
      <div>
        <div class="course-title">${item.titulo}</div>
        <div class="course-sub">${item.instituicao} • ${item.carga} • ${item.data}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      setActiveCourse(card);
      renderPreviewFormacao(item);
    });

    coursesList.appendChild(card);

    if (index === 0) {
      setActiveCourse(card);
      renderPreviewFormacao(item);
    }
  });
}

async function initFormacoes() {
  const res = await fetch("data/formacoes.json");
  allFormacoes = await res.json();

  renderFormacoesList(currentCategory);

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      renderFormacoesList(currentCategory);
    });
  });
}

/* PROJETOS */
const projectsGrid = $("#projectsGrid");
const projectSearch = $("#projectSearch");
const techFilters = $("#techFilters");

let allProjects = [];
let activeTech = "all";
let searchText = "";
function uniqueTechs(projects) {
  const set = new Set();

  projects.forEach((p) =>
    (p.filter || []).forEach((t) => {
      set.add(t);
    }),
  );

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderTechFilters(projects) {
  const techs = uniqueTechs(projects);
  techFilters.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "filter active";
  allBtn.textContent = "✨ Todas";
  allBtn.dataset.tech = "all";
  techFilters.appendChild(allBtn);

  techs.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "filter";
    btn.textContent = t;
    btn.dataset.tech = t;
    techFilters.appendChild(btn);
  });

  techFilters.addEventListener("click", (e) => {
    const b = e.target.closest(".filter");
    if (!b) return;
    $$(".filter").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    activeTech = b.dataset.tech;
    renderProjects();
  });
}

function matchProject(p) {
  const lang = localStorage.getItem("lang") || "pt";

  const byTech = activeTech === "all" || (p.filter || []).includes(activeTech);

  const q = searchText.trim().toLowerCase();

  const hay = `
    ${p.title?.[lang] || ""}
    ${p.subtitle?.[lang] || ""}
    ${p.problem?.[lang] || ""}
    ${p.solution?.[lang] || ""}
    ${(p.stack || []).join(" ")}
  `.toLowerCase();

  const bySearch = !q || hay.includes(q);

  return byTech && bySearch;
}
function renderProjects() {
  const filtered = allProjects.filter(matchProject);
  const lang = localStorage.getItem("lang") || "pt";

  if (filtered.length === 0) {
    projectsGrid.innerHTML = `<div class="muted">Nenhum projeto encontrado.</div>`;
    return;
  }

  projectsGrid.innerHTML = filtered
    .map(
      (p) => `
    <article class="project-card" data-id="${p.id}">
      <div class="project-top">
        <div class="project-title">${p.title?.[lang] || ""}</div>
        <div class="project-badge">${p.badge?.[lang] || p.badge || ""}</div>
      </div>
      <div class="project-desc">${p.subtitle?.[lang] || ""}</div>
      <div class="project-tags">
        ${(p.stack || [])
          .slice(0, 6)
          .map((t) => `<span class="tag">${t}</span>`)
          .join("")}
      </div>
    </article>
  `,
    )
    .join("");
}
let currentOpenProject = null;

function openProjectModal(project) {
  currentOpenProject = project; // salva o projeto atualmente aberto

  const modal = $("#projectModal");
  const content = $("#modalContent");
  const lang = localStorage.getItem("lang") || "pt";

  // Função auxiliar para pegar texto multilíngue
  const t = (field) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[lang] || field.pt || "";
  };

  const links = (project.links || [])
    .map(
      (l) => `
    <a class="btn ${l.primary ? "primary" : ""}" 
       href="${l.url}" 
       target="_blank" 
       rel="noopener">
       ${t(l.label)}
    </a>
  `,
    )
    .join("");

  const highlights = Array.isArray(project.highlights)
    ? project.highlights
    : project.highlights?.[lang] || [];

  content.innerHTML = `
    <h3 style="font-size:20px;margin-bottom:6px;">
      ${t(project.title)}
    </h3>

    <p class="muted" style="margin-bottom:12px;">
      ${t(project.subtitle)}
    </p>

    ${
      project.cover
        ? `
      <div style="margin:10px 0 14px;">
        <img src="${project.cover}" 
             alt="Capa do projeto ${t(project.title)}" 
             style="width:100%;border-radius:14px;border:1px solid var(--border);" />
      </div>
    `
        : ""
    }

    <div class="preview-info">
      <div class="info-chip">
        <span>${lang === "en" ? "Problem" : "Problema"}</span>
        ${t(project.problem)}
      </div>

      <div class="info-chip">
        <span>${lang === "en" ? "Solution" : "Solução"}</span>
        ${t(project.solution)}
      </div>

      <div class="info-chip">
        <span>${lang === "en" ? "Technologies" : "Tecnologias"}</span>
        ${(project.stack || []).join(", ")}
      </div>

      <div class="info-chip">
        <span>${lang === "en" ? "Highlights" : "Destaques"}</span>
        ${(highlights || []).join(" • ")}
      </div>
    </div>

    <div class="preview-actions">
      ${links || `<span class="muted">${lang === "en" ? "No links available." : "Sem links disponíveis."}</span>`}
    </div>
  `;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = $("#projectModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function initProjects() {
  try {
    const res = await fetch("data/projects.json");

    if (!res.ok) {
      throw new Error("Erro ao carregar projects.json");
    }

    allProjects = await res.json();

    renderTechFilters(allProjects);
    renderProjects();

    projectSearch.addEventListener("input", (e) => {
      searchText = e.target.value;
      renderProjects();
    });

    projectsGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".project-card");
      if (!card) return;
      const id = card.dataset.id;
      const project = allProjects.find((p) => String(p.id) === String(id));
      if (project) openProjectModal(project);
    });

    $("#projectModal").addEventListener("click", (e) => {
      if (e.target.dataset.close === "true") closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  } catch (error) {
    console.error("Erro ao iniciar projetos:", error);
    projectsGrid.innerHTML = `<div class="muted">Erro ao carregar projetos.</div>`;
  }
}
/* INIT */
initFormacoes().catch(console.error);
initProjects().catch(console.error);

// ============================
// i18n PT/EN (TESTE)
// ============================
// ============================
// i18n PT/EN (Site todo)
// ============================
const langToggle = document.getElementById("langToggle");
const i18n = {
  pt: {
    // Nav
    nav_experiences: "Experiências",
    nav_edu: "Formações",
    nav_projects: "Projetos",
    nav_contact: "Contato",
    nav_projects_btn: "Ver Projetos",

    // Hero
    kicker: "Portfólio Interativo",
    hero_title:
      "Dev Full Stack com foco em UI/UX, boas práticas e soluções que resolvem problemas reais.",
    hero_sub:
      "Formação, certificações e projetos com utilidade clara, stack utilizada e organização técnica.",
    hero_btn_projects: "🚀 Projetos",
    hero_btn_certs: "🎓 Certificados",
    hero_card_title: "O que você encontra aqui",
    hero_li_1: "✅ Formações com certificados (visualização)",
    hero_li_2: "✅ Projetos com utilidade + stack + links",
    hero_li_3: "✅ Filtros por tecnologia e busca",
    hero_li_4: "✅ UI/UX limpa, responsiva e rápida",

    // Experiências
    exp_title: "Experiências",
    exp_sub: "Minha trajetória profissional na área de tecnologia.",

    exp1_title: "Técnico de Suporte de TI",
    exp1_company: "Centro de Operações Rio (COR)",
    exp1_desc:
      "Atuação no setor de TI com suporte presencial, resolução de chamados, infraestrutura de rede e desenvolvimento de soluções internas.",
    exp1_li1: "Sistema interno integrado ao Google Calendar",
    exp1_li2: "Ferramenta de monitoramento automático de links",
    exp1_li3: "Infraestrutura e cabeamento estruturado",
    exp1_li4: "Administração básica de Active Directory",

    exp2_title: "Desenvolvedor Web",
    exp2_company: "VVTrafficData – Portugal (Presencial)",
    exp2_desc:
      "Desenvolvimento e manutenção de aplicações web com foco em responsividade e boas práticas.",
    exp2_li1: "Criação de interfaces responsivas",
    exp2_li2: "Organização de layout e hierarquia visual",
    exp2_li3: "Melhoria da experiência do usuário",

    // Formações
    edu_title: "Formações & Certificados",
    edu_sub: "Clique em um item para ver o certificado no painel.",
    edu_library: "Biblioteca de Certificados",
    edu_library_sub: "Separado por categoria para ficar “cara de painel”.",
    edu_counter: "certificados",
    tab_grad: "🎓 Graduação",
    tab_pos: "📜 Pós",
    tab_courses: "🤖 Cursos Livres",
    tab_all: "✨ Todos",
    preview_pick: "Selecione um curso",
    preview_pick_sub: "O certificado e as informações aparecerão aqui.",

    // Projetos
    projects_title: "Projetos",
    projects_sub:
      "Cards com utilidade + tecnologias. Clique para ver detalhes.",
    projects_search: "Buscar projeto...",

    // Contato
    contact_title: "Contato",
    contact_sub: "Links e um CTA final simples.",
    contact_lets: "Vamos conversar",
    contact_hint: "Deixe seus links aqui (LinkedIn, GitHub, e-mail, WhatsApp).",
    contact_email: "E-mail",
    contact_location: "Local",
    back_top: "Voltar ao topo ↑",
  },

  en: {
    // Nav
    nav_experiences: "Experience",
    nav_edu: "Education",
    nav_projects: "Projects",
    nav_contact: "Contact",
    nav_projects_btn: "View Projects",

    // Hero
    kicker: "Interactive Portfolio",
    hero_title:
      "Full Stack Developer focused on UI/UX, best practices, and solutions that solve real problems.",
    hero_sub:
      "Education, certifications, and projects with clear purpose, stack used, and solid technical organization.",
    hero_btn_projects: "🚀 Projects",
    hero_btn_certs: "🎓 Certificates",
    hero_card_title: "What you’ll find here",
    hero_li_1: "✅ Education with certificate preview",
    hero_li_2: "✅ Projects with purpose + stack + links",
    hero_li_3: "✅ Tech filters and search",
    hero_li_4: "✅ Clean, responsive, fast UI/UX",

    // Experience
    exp_title: "Experience",
    exp_sub: "My professional journey in technology.",

    exp1_title: "IT Support Technician",
    exp1_company: "Rio Operations Center (COR)",
    exp1_desc:
      "IT department support with on-site help desk, infrastructure, and internal system development.",
    exp1_li1: "Internal system integrated with Google Calendar",
    exp1_li2: "Automated link monitoring tool",
    exp1_li3: "Network infrastructure and structured cabling",
    exp1_li4: "Basic Active Directory administration",

    exp2_title: "Web Developer",
    exp2_company: "VVTrafficData – Portugal (On-site)",
    exp2_desc:
      "Development and maintenance of web applications focused on responsiveness and best practices.",
    exp2_li1: "Responsive interface development",
    exp2_li2: "Layout organization and visual hierarchy",
    exp2_li3: "User experience improvement",

    // Education
    edu_title: "Education & Certificates",
    edu_sub: "Click an item to preview the certificate.",
    edu_library: "Certificate Library",
    edu_library_sub: "Grouped by category for a clean dashboard feel.",
    edu_counter: "certificates",
    tab_grad: "🎓 Degree",
    tab_pos: "📜 Postgraduate",
    tab_courses: "🤖 Courses",
    tab_all: "✨ All",
    preview_pick: "Select a course",
    preview_pick_sub: "The certificate and details will appear here.",

    // Projects
    projects_title: "Projects",
    projects_sub: "Cards with purpose + technologies. Click to view details.",
    projects_search: "Search project...",

    // Contact
    contact_title: "Contact",
    contact_sub: "Links and a simple final CTA.",
    contact_lets: "Let’s talk",
    contact_hint: "Put your links here (LinkedIn, GitHub, email, WhatsApp).",
    contact_email: "Email",
    contact_location: "Location",
    back_top: "Back to top ↑",
  },
};

function applyLanguage(lang) {
  const dict = i18n[lang] || i18n.pt;
  document.documentElement.lang = lang === "en" ? "en" : "pt-BR";

  // Textos normais
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  // Placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.setAttribute("placeholder", dict[key]);
  });

  localStorage.setItem("lang", lang);

  const modal = document.getElementById("projectModal");

  if (currentOpenProject && modal && modal.classList.contains("open")) {
    openProjectModal(currentOpenProject);
  }
}

applyLanguage(localStorage.getItem("lang") || "pt");

langToggle?.addEventListener("click", () => {
  const current = localStorage.getItem("lang") || "pt";
  const next = current === "pt" ? "en" : "pt";
  applyLanguage(next);
});
