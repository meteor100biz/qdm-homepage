(() => {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");
  if (!form || !status) return;

  const button = form.querySelector('button[type="submit"]');
  const fileInput = document.getElementById("contactFiles");
  const startedAt = form.elements.namedItem("startedAt");
  const maxFiles = 2;
  const maxFileSize = 20 * 1024 * 1024;
  const allowedExtensions = /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif|pdf|zip|7z|rar|dwg|dxf|step|stp|iges|igs)$/i;
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
    button.textContent = "접수 중...";
    setStatus("문의·견적 요청을 접수하고 있습니다.");

    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const files = Array.from(fileInput?.files || []);
      if (values.website) throw new Error("접수할 수 없습니다.");
      if (Date.now() - Number(values.startedAt || 0) < 2000) throw new Error("잠시 후 다시 접수해 주세요.");
      if (files.length > maxFiles) throw new Error("첨부파일은 최대 2개까지 가능합니다.");
      for (const file of files) {
        if (file.size > maxFileSize) throw new Error(`${file.name}: 파일당 20MB까지 첨부할 수 있습니다.`);
        if (!allowedExtensions.test(file.name)) throw new Error(`${file.name}: 지원하지 않는 파일 형식입니다.`);
      }
      if (!window.supabase || !window.QDM_SUPABASE_URL || !window.QDM_SUPABASE_KEY) {
        throw new Error("상담 접수 설정을 불러오지 못했습니다.");
      }

      const client = window.supabase.createClient(window.QDM_SUPABASE_URL, window.QDM_SUPABASE_KEY);
      const submissionId = crypto.randomUUID();
      const attachments = [];

      for (const [index, file] of files.entries()) {
        setStatus(`첨부파일을 업로드하고 있습니다. (${index + 1}/${files.length})`);
        const extensionMatch = file.name.match(/(\.[a-z0-9]+)$/i);
        const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "";
        const path = `${submissionId}/${index + 1}-${Date.now()}${extension}`;
        const { error: uploadError } = await client.storage
          .from(window.QDM_STORAGE_BUCKET || "qdm-inquiry-files")
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type || "application/octet-stream",
            upsert: false
          });
        if (uploadError) throw uploadError;
        attachments.push({
          name: file.name,
          path,
          size: file.size,
          type: file.type || "application/octet-stream"
        });
      }

      setStatus("문의·견적 요청을 저장하고 있습니다.");
      const { error } = await client.from("qdm_inquiries").insert({
        submission_id: submissionId,
        name: values.name.trim(),
        company: values.company.trim() || null,
        phone: values.phone.trim(),
        email: values.email.trim(),
        subject: values.subject.trim() || null,
        message: values.message.trim(),
        attachments
      });
      if (error) throw error;

      form.reset();
      setStartedAt();
      setStatus("문의·견적 요청이 접수되었습니다. 확인 후 연락드리겠습니다.", "success");
    } catch (error) {
      console.error("QDM inquiry submission failed", error);
      const message = error?.message || "접수 중 오류가 발생했습니다.";
      const isUserMessage =
        message.includes("최대 2개") ||
        message.includes("20MB") ||
        message.includes("지원하지 않는 파일") ||
        message.includes("잠시 후 다시 접수");
      setStatus(
        `${isUserMessage ? message : "접수 중 오류가 발생했습니다."} 또는 contact@qdm.co.kr로 보내주세요.`,
        "error"
      );
    } finally {
      button.disabled = false;
      button.textContent = "문의·견적 요청";
    }
  });
})();
