(() => {
  const markerClass = "required-field-marker";
  if (!document.getElementById("required-field-marker-style")) {
    const style = document.createElement("style");
    style.id = "required-field-marker-style";
    style.textContent = `.${markerClass}{color:#dc3545!important;font-weight:700;margin-left:.2rem}`;
    document.head.appendChild(style);
  }

  function markRequiredLabels(root = document) {
    const labels = root.matches?.("label")
      ? [root, ...root.querySelectorAll("label")]
      : [...(root.querySelectorAll?.("label") || [])];
    labels.forEach(label => {
      const existingStar = [...label.querySelectorAll("span")]
        .find(span => span.textContent.trim() === "*");
      if (existingStar) {
        existingStar.classList.add(markerClass);
        return;
      }

      const controls = [...label.querySelectorAll("input[required], select[required], textarea[required]")];
      const explicitRequired = label.htmlFor
        ? document.getElementById(label.htmlFor)?.required
        : false;
      if (!controls.length && !explicitRequired) return;

      const marker = document.createElement("span");
      marker.className = markerClass;
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "*";
      const checkbox = controls.find(control => control.type === "checkbox" || control.type === "radio");
      const firstControl = controls[0];
      if (checkbox) label.append(" ", marker);
      else if (firstControl) label.insertBefore(marker, firstControl);
      else label.append(" ", marker);
    });
  }

  markRequiredLabels();
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) markRequiredLabels(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
