const STORAGE_KEY = "technicianRevenueRecords";

const form = document.querySelector("#recordForm");
const recordRows = document.querySelector("#recordRows");
const emptyState = document.querySelector("#emptyState");
const filterDate = document.querySelector("#filterDate");
const cancelEdit = document.querySelector("#cancelEdit");
const submitButton = document.querySelector("#submitButton");

const currency = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });

let records = loadRecords();

document.querySelector("#workDate").valueAsDate = new Date();
filterDate.valueAsDate = new Date();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = readForm();
  if (!data) return;

  const editingId = document.querySelector("#recordId").value;
  if (editingId) {
    records = records.map((record) => (record.id === editingId ? { ...data, id: editingId } : record));
  } else {
    records.unshift({ ...data, id: crypto.randomUUID() });
  }

  saveRecords();
  resetForm();
  render();
});

cancelEdit.addEventListener("click", resetForm);
document.querySelector("#showAll").addEventListener("click", () => {
  filterDate.value = "";
  render();
});
filterDate.addEventListener("change", render);
document.querySelector("#clearData").addEventListener("click", () => {
  if (!records.length || !confirm("确定要清空所有记录吗？此操作不可恢复。")) return;
  records = [];
  saveRecords();
  render();
});
document.querySelector("#seedDemo").addEventListener("click", () => {
  records = demoRecords().concat(records);
  saveRecords();
  render();
});

recordRows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const record = records.find((item) => item.id === button.dataset.id);
  if (!record) return;

  if (button.dataset.action === "delete") {
    records = records.filter((item) => item.id !== record.id);
    saveRecords();
    render();
    return;
  }

  document.querySelector("#recordId").value = record.id;
  document.querySelector("#workDate").value = record.workDate;
  document.querySelector("#technician").value = record.technician;
  document.querySelector("#serviceItem").value = record.serviceItem;
  document.querySelector("#clockCount").value = record.clockCount;
  document.querySelector("#amount").value = record.amount;
  document.querySelector("#note").value = record.note;
  submitButton.textContent = "更新记录";
  cancelEdit.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

function readForm() {
  const formData = new FormData(form);
  const clockCount = Number(formData.get("clockCount"));
  const amount = Number(formData.get("amount"));
  if (clockCount <= 0 || amount < 0) {
    alert("请填写有效的上钟数量和金额。上钟数量必须大于 0，金额不能为负数。");
    return null;
  }

  return {
    workDate: formData.get("workDate"),
    technician: formData.get("technician").trim(),
    serviceItem: formData.get("serviceItem").trim(),
    clockCount,
    amount,
    note: formData.get("note").trim(),
  };
}

function resetForm() {
  form.reset();
  document.querySelector("#recordId").value = "";
  document.querySelector("#workDate").valueAsDate = new Date();
  submitButton.textContent = "保存记录";
  cancelEdit.classList.add("hidden");
}

function render() {
  const visibleRecords = getVisibleRecords();
  renderStats(visibleRecords);
  renderRows(visibleRecords);
  renderSummary("#itemSummary", groupBy(visibleRecords, "serviceItem"), "项目");
  renderSummary("#technicianSummary", groupBy(visibleRecords, "technician"), "技师");
}

function getVisibleRecords() {
  const selectedDate = filterDate.value;
  return selectedDate ? records.filter((record) => record.workDate === selectedDate) : records;
}

function renderStats(items) {
  const totalClock = sum(items, "clockCount");
  const totalRevenue = sum(items, "amount");
  document.querySelector("#totalClockCount").textContent = totalClock;
  document.querySelector("#totalRevenue").textContent = currency.format(totalRevenue);
  document.querySelector("#averageTicket").textContent = currency.format(totalClock ? totalRevenue / totalClock : 0);
  document.querySelector("#technicianCount").textContent = new Set(items.map((item) => item.technician)).size;
  document.querySelector("#recordCount").textContent = `${items.length} 条`;
}

function renderRows(items) {
  recordRows.innerHTML = items
    .map((record) => `
      <tr>
        <td>${record.workDate}</td>
        <td>${escapeHtml(record.technician)}</td>
        <td>${escapeHtml(record.serviceItem)}</td>
        <td>${record.clockCount}</td>
        <td>${currency.format(record.amount)}</td>
        <td>${escapeHtml(record.note || "-")}</td>
        <td class="actions">
          <button class="secondary-button" data-action="edit" data-id="${record.id}" type="button">编辑</button>
          <button class="danger-button" data-action="delete" data-id="${record.id}" type="button">删除</button>
        </td>
      </tr>`)
    .join("");
  emptyState.classList.toggle("hidden", items.length > 0);
}

function renderSummary(selector, groups, label) {
  const container = document.querySelector(selector);
  const entries = Object.entries(groups).sort(([, a], [, b]) => b.amount - a.amount);
  container.innerHTML = entries.length
    ? entries.map(([name, value]) => `
      <div class="summary-item">
        <div>
          <strong>${escapeHtml(name)}</strong>
          <span>${label}汇总</span>
        </div>
        <div>
          <strong>${currency.format(value.amount)}</strong>
          <span>${value.clockCount} 次上钟</span>
        </div>
      </div>`).join("")
    : '<p class="empty-state">暂无汇总数据</p>';
}

function groupBy(items, key) {
  return items.reduce((result, item) => {
    const name = item[key];
    result[name] ||= { amount: 0, clockCount: 0 };
    result[name].amount += item.amount;
    result[name].clockCount += item.clockCount;
    return result;
  }, {});
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key]), 0);
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function demoRecords() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { id: crypto.randomUUID(), workDate: today, technician: "小李", serviceItem: "足疗", clockCount: 4, amount: 1180, note: "含会员卡消费" },
    { id: crypto.randomUUID(), workDate: today, technician: "小王", serviceItem: "SPA", clockCount: 3, amount: 1680, note: "老客预约" },
    { id: crypto.randomUUID(), workDate: today, technician: "小陈", serviceItem: "肩颈调理", clockCount: 2, amount: 596, note: "新客到店" },
  ];
}

render();
