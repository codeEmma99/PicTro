(function () {
  function buildButton({
    text,
    type = "button",
    className = "",
    dataset = {},
    ariaLabel,
    icon = "",
    style = ""
  }) {
    const button = document.createElement("button");
    button.type = type;
    button.textContent = text;
    if (icon) {
      button.innerHTML = `${icon}${button.textContent}`;
    }
    if (className) button.className = className;
    if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
    Object.entries(dataset).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        button.dataset[key] = String(value);
      }
    });
    if (style) button.setAttribute("style", style);
    return button;
  }

  function createPrimaryButton({ text, dataset = {}, ariaLabel, icon = "" }) {
    return buildButton({
      text,
      className: "primary-button",
      dataset,
      ariaLabel,
      icon
    });
  }

  function createSecondaryButton({ text, dataset = {}, ariaLabel, icon = "" }) {
    return buildButton({
      text,
      className: "secondary-button",
      dataset,
      ariaLabel,
      icon
    });
  }

  function createNavButton({ label, view, icon, active = false }) {
    const button = buildButton({
      text: label,
      className: `nav-item${active ? " is-active" : ""}`,
      dataset: { view },
      ariaLabel: label,
      icon
    });
    button.innerHTML = `${icon} ${label}`;
    return button;
  }

  function createAccountMenuButton({ name, role, avatar }) {
    const wrapper = document.createElement("div");
    wrapper.className = "profile-card account-menu-button";
    wrapper.dataset.accountMenu = "true";
    wrapper.setAttribute("role", "button");
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("aria-label", `${name} account menu`);

    const avatarEl = document.createElement("div");
    avatarEl.className = "avatar";
    avatarEl.textContent = avatar;

    const text = document.createElement("div");
    text.innerHTML = `<strong>${name}</strong><span>${role}</span>`;

    const more = document.createElement("span");
    more.className = "more";
    more.textContent = "•••";
    more.setAttribute("aria-hidden", "true");

    wrapper.appendChild(avatarEl);
    wrapper.appendChild(text);
    wrapper.appendChild(more);
    return wrapper;
  }

  window.PicTroButtons = {
    buildButton,
    createPrimaryButton,
    createSecondaryButton,
    createNavButton,
    createAccountMenuButton
  };
})();
