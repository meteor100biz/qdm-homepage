(() => {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");
  if (!form || !status) return;

  const button = form.querySelector('button[type="submit"]');
  const startedAt = form.elements.namedItem("startedAt");
  const setStartedAt = () => { startedAt.value = String(Date.now()); };
  setStartedAt();

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = `form-status full ${type}`.trim();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    button.disabled = true;
    button.textContent = "전송 중...";
    setStatus("문의 내용을 전송하고 있습니다.");

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "메일을 전송하지 못했습니다.");

      form.reset();
      setStartedAt();
      setStatus("문의가 정상적으로 전송되었습니다. 확인 후 연락드리겠습니다.", "success");
    } catch (error) {
      setStatus(`${error.message} 잠시 후 다시 시도하거나 contact@qdm.co.kr로 보내주세요.`, "error");
    } finally {
      button.disabled = false;
      button.textContent = "문의 보내기";
    }
  });
})();
