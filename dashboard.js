“use strict”;

const { createClient } = window.supabase;

const db = createClient(
window.HOPE_CONFIG.SUPABASE_URL,
window.HOPE_CONFIG.SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

const MODULES = {
cumpleanos: {
title: “Cumpleaños”,
description: “Registro de cumpleaños del grupo.”,
table: “cumpleanos”,
fields: [
{ key: “nombre”, label: “Cumpleañero”, type: “text” },
{ key: “fecha”, label: “Fecha”, type: “date” }
]
},
reuniones: {
title: “Reuniones”,
description: “Registro de predicadores, temas y fechas.”,
table: “reuniones”,
fields: [
{ key: “predicador”, label: “Predicador”, type: “text” },
{ key: “tema”, label: “Tema”, type: “text” },
{ key: “fecha”, label: “Fecha”, type: “date” }
]
},
eventos: {
title: “Eventos”,
description: “Registro de actividades y fechas.”,
table: “eventos”,
fields: [
{ key: “nombre”, label: “Evento”, type: “text” },
{ key: “fecha”, label: “Fecha”, type: “date” }
]
},
plannings: {
title: “Plannings”,
description: “Registro de predicadores y fechas.”,
table: “plannings”,
fields: [
{ key: “predicador”, label: “Predicador”, type: “text” },
{ key: “fecha”, label: “Fecha”, type: “date” }
]
}
};

let currentModule = “cumpleanos”;
let records = [];
let busy = false;

/* =====================================================
MENSAJES Y UTILIDADES
===================================================== */

function showMessage(message, isError = false) {
$(“statusMessage”).textContent = message;
$(“statusMessage”).style.color = isError ? “#b42318” : “#267344”;
}

function escapeHTML(value) {
return String(value ?? “”).replace(/[&<>”’]/g, (char) => ({
“&”: “&”,
“<”: “<”,
“>”: “>”,
‘”’: “"”,
“’”: “'”
})[char]);
}

function formatDate(value) {
if (!value) return “”;

const parts = String(value).slice(0, 10).split(”-”);

if (parts.length !== 3) return value;

return ${parts[2]}/${parts[1]}/${parts[0]};
}

function getModule() {
return MODULES[currentModule];
}

/* =====================================================
ACCESO Y AUTORIZACIÓN
===================================================== */

async function checkAccess() {
const { data, error } = await db.auth.getUser();

if (error || !data.user) {
window.location.replace(“index.html”);
return false;
}

const { data: profile, error: profileError } = await db
.from(“perfiles_acceso”)
.select(“nombre, rol, activo”)
.eq(“user_id”, data.user.id)
.maybeSingle();

if (profileError || !profile || !profile.activo) {
await db.auth.signOut();
window.location.replace(“index.html”);
return false;
}

$(“userName”).textContent = ${profile.nombre} · ${profile.rol};

return true;
}

/* =====================================================
FORMULARIO DINÁMICO
===================================================== */

function renderForm() {
const module = getModule();

$(“formFields”).innerHTML = module.fields.map((field) => `
${escapeHTML(field.label)}
  <input
    id="field-${field.key}"
    name="${field.key}"
    type="${field.type}"
    required
    autocomplete="off"
  >
</div>

`).join(””);
}

function resetForm() {
$(“recordForm”).reset();
$(“recordId”).value = “”;
$(“saveButton”).textContent = “Guardar registro”;
$(“cancelButton”).hidden = true;
}

function getFormValues() {
const values = {};

for (const field of getModule().fields) {
values[field.key] = $(field-${field.key}).value.trim();
}

return values;
}

/* =====================================================
TABLA DE REGISTROS
===================================================== */

function renderTable() {
const module = getModule();

$(“tableHead”).innerHTML = <tr> ${module.fields.map((field) =>
${escapeHTML(field.label)}
).join("")} <th scope="col">Acciones</th> </tr> ;

$(“recordCount”).textContent =
${records.length} ${records.length === 1 ? "registro" : "registros"};

if (records.length === 0) {
$(“tableBody”).innerHTML = <tr> <td colspan="${module.fields.length + 1}"> No hay registros guardados. </td> </tr>;
return;
}

$(“tableBody”).innerHTML = records.map((record) => <tr> ${module.fields.map((field) =>
${escapeHTML(
field.key === “fecha”
? formatDate(record[field.key])
: record[field.key]
)}
`).join(””)}

  <td class="actions-cell">
    <button
      type="button"
      class="action-button edit-button"
      data-action="edit"
      data-id="${escapeHTML(record.id)}"
    >
      Editar
    </button>
    <button
      type="button"
      class="action-button delete-button"
      data-action="delete"
      data-id="${escapeHTML(record.id)}"
    >
      Eliminar
    </button>
  </td>
</tr>

`).join(””);
}

async function loadRecords() {
const module = getModule();

$(“tableBody”).innerHTML = <tr> <td colspan="${module.fields.length + 1}"> Cargando registros... </td> </tr>;

const { data, error } = await db
.from(module.table)
.select(”*”)
.order(“fecha”, { ascending: false });

if (error) {
records = [];
renderTable();
showMessage(“No se pudieron cargar los registros: “ + error.message, true);
return;
}

records = data || [];
renderTable();
showMessage(””);
}

/* =====================================================
CAMBIO ENTRE MÓDULOS
===================================================== */

function selectModule(moduleName) {
if (!MODULES[moduleName]) return;

currentModule = moduleName;

document.querySelectorAll(”.module-button”).forEach((button) => {
const selected = button.dataset.module === moduleName;

button.classList.toggle("active", selected);
button.setAttribute("aria-current", selected ? "page" : "false");

});

const module = getModule();

$(“moduleTitle”).textContent = module.title;
$(“moduleDescription”).textContent = module.description;

resetForm();
renderForm();
loadRecords();
}

/* =====================================================
MENÚ MÓVIL: TRES BARRAS
===================================================== */

const menuToggle = $(“menuToggle”);
const sidebarOverlay = $(“sidebarOverlay”);

function closeMobileMenu() {
document.body.classList.remove(“menu-open”);

if (menuToggle) {
menuToggle.setAttribute(“aria-expanded”, “false”);
menuToggle.setAttribute(“aria-label”, “Abrir menú”);
}
}

if (menuToggle) {
menuToggle.addEventListener(“click”, () => {
const isOpen = !document.body.classList.contains(“menu-open”);

document.body.classList.toggle("menu-open", isOpen);
menuToggle.setAttribute("aria-expanded", String(isOpen));
menuToggle.setAttribute(
  "aria-label",
  isOpen ? "Cerrar menú" : "Abrir menú"
);

});
}

if (sidebarOverlay) {
sidebarOverlay.addEventListener(“click”, closeMobileMenu);
}

document.addEventListener(“keydown”, (event) => {
if (event.key === “Escape”) {
closeMobileMenu();
}
});

/* =====================================================
BOTONES DE NAVEGACIÓN
===================================================== */

document.querySelectorAll(”.module-button”).forEach((button) => {
button.addEventListener(“click”, () => {
selectModule(button.dataset.module);
closeMobileMenu();
});
});

/* =====================================================
GUARDAR Y ACTUALIZAR REGISTROS
===================================================== */

$(“recordForm”).addEventListener(“submit”, async (event) => {
event.preventDefault();

if (busy) return;

busy = true;
$(“saveButton”).disabled = true;

try {
const module = getModule();
const id = $(“recordId”).value;
const values = getFormValues();

showMessage(id ? "Actualizando registro..." : "Guardando registro...");
let result;
if (id) {
  result = await db
    .from(module.table)
    .update(values)
    .eq("id", id);
} else {
  result = await db
    .from(module.table)
    .insert(values);
}
if (result.error) throw result.error;
resetForm();
await loadRecords();
showMessage(id ? "Registro actualizado." : "Registro guardado.");

} catch (error) {
showMessage(“No se pudo guardar: “ + error.message, true);
} finally {
busy = false;
$(“saveButton”).disabled = false;
}
});

/* =====================================================
EDITAR Y ELIMINAR REGISTROS
===================================================== */

$(“tableBody”).addEventListener(“click”, async (event) => {
const button = event.target.closest(“button[data-action]”);

if (!button || busy) return;

const record = records.find((item) => String(item.id) === button.dataset.id);

if (!record) return;

const action = button.dataset.action;
const module = getModule();

if (action === “edit”) {
$(“recordId”).value = record.id;

for (const field of module.fields) {
  $(`field-${field.key}`).value = record[field.key] ?? "";
}
$("saveButton").textContent = "Guardar cambios";
$("cancelButton").hidden = false;
showMessage("Editando registro.");
$("recordForm").scrollIntoView({
  behavior: "smooth",
  block: "start"
});
return;

}

if (action === “delete”) {
const description = module.fields
.map((field) => record[field.key])
.filter(Boolean)
.join(” · “);

if (!window.confirm(`¿Eliminar este registro?\n\n${description}`)) {
  return;
}
busy = true;
button.disabled = true;
try {
  showMessage("Eliminando registro...");
  const { error } = await db
    .from(module.table)
    .delete()
    .eq("id", record.id);
  if (error) throw error;
  if (String($("recordId").value) === String(record.id)) {
    resetForm();
  }
  await loadRecords();
  showMessage("Registro eliminado.");
} catch (error) {
  showMessage("No se pudo eliminar: " + error.message, true);
} finally {
  busy = false;
}

}
});

/* =====================================================
CANCELAR EDICIÓN
===================================================== */

$(“cancelButton”).addEventListener(“click”, () => {
resetForm();
showMessage(“Edición cancelada.”);
});

/* =====================================================
CERRAR SESIÓN
===================================================== */

$(“logoutButton”).addEventListener(“click”, async () => {
$(“logoutButton”).disabled = true;

const { error } = await db.auth.signOut();

if (error) {
showMessage(“No se pudo cerrar sesión: “ + error.message, true);
$(“logoutButton”).disabled = false;
return;
}

window.location.replace(“index.html”);
});

/* =====================================================
EXPORTAR MÓDULO ACTUAL A PDF
===================================================== */

$(“pdfButton”).addEventListener(“click”, () => {
if (!window.jspdf || !window.jspdf.jsPDF) {
showMessage(
“No se pudo cargar la librería PDF. Revise su conexión.”,
true
);
return;
}

try {
const module = getModule();
const { jsPDF } = window.jspdf;
const doc = new jsPDF({ orientation: “portrait” });

doc.setFontSize(16);
doc.text("Hope Group", 14, 16);
doc.setFontSize(12);
doc.text(module.title, 14, 24);
doc.setFontSize(9);
doc.text(
  `Generado: ${new Date().toLocaleDateString("es-GT")}`,
  14,
  30
);
const head = [
  module.fields.map((field) => field.label)
];
const body = records.map((record) =>
  module.fields.map((field) =>
    field.key === "fecha"
      ? formatDate(record[field.key])
      : String(record[field.key] ?? "")
  )
);
if (typeof doc.autoTable !== "function") {
  throw new Error("No se pudo cargar el complemento de tablas PDF.");
}
doc.autoTable({
  head,
  body,
  startY: 36,
  theme: "grid",
  styles: {
    fontSize: 9,
    cellPadding: 3,
    overflow: "linebreak"
  },
  headStyles: {
    fillColor: [35, 35, 35],
    textColor: [255, 255, 255]
  },
  margin: {
    top: 15,
    right: 14,
    bottom: 15,
    left: 14
  },
  showHead: "everyPage"
});
doc.save(
  `Hope-Database-${currentModule}-${new Date().toISOString().slice(0, 10)}.pdf`
);
showMessage("PDF generado.");

} catch (error) {
showMessage(“No se pudo generar el PDF: “ + error.message, true);
}
});

/* =====================================================
INICIAR PANEL
===================================================== */

async function startDashboard() {
try {
const authorized = await checkAccess();

if (!authorized) return;
renderForm();
await loadRecords();

} catch (error) {
showMessage(“Error al iniciar el panel: “ + error.message, true);
}
}

startDashboard();

