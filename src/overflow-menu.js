import './editor';

export const hideMenuItems = (config, header, edit_mode, haElem) => {
  const localized = (item, string) => {
    let localString;
    const hass = document.querySelector('home-assistant').hass;
    if (string === 'raw_editor') localString = hass.localize('ui.panel.lovelace.editor.menu.raw_editor');
    else if (string == 'unused_entities') localString = hass.localize('ui.panel.lovelace.unused_entities.title');
    else localString = hass.localize(`ui.panel.lovelace.menu.${string}`) || string;
    return item.innerHTML.includes(localString) || item.getAttribute('aria-label') == localString;
  };
  (edit_mode ? haElem.options : header.options)
    .querySelector('paper-listbox')
    .querySelectorAll('paper-item')
    .forEach(item => {
      if (
        (config.hide_help && localized(item, 'help')) ||
        (config.hide_unused && localized(item, 'unused_entities')) ||
        (config.hide_refresh && localized(item, 'refresh')) ||
        (config.hide_config && localized(item, 'configure_ui')) ||
        (config.hide_raw && localized(item, 'raw_editor')) ||
        (config.hide_reload_resources && localized(item, 'Reload resources'))
      ) {
        item.style.display = 'none';
      } else {
        item.style.display = '';
      }
    });
};

// Add button to overflow menu.
export const buttonToOverflow = (item, mdiIcon, header, config) => {
  if (header.options.querySelector(`#${item.toLowerCase()}_dropdown`)) {
    header.options.querySelector(`#${item.toLowerCase()}_dropdown`).remove();
  }
  const paperItem = document.createElement('paper-item');
  const icon = document.createElement('ha-icon');
  paperItem.setAttribute('id', `${item.toLowerCase()}_dropdown`);
  icon.setAttribute('icon', config.button_icons[item.toLowerCase()] || mdiIcon);
  icon.style.pointerEvents = 'none';
  if (config.reverse_button_direction) icon.style.marginLeft = 'auto';
  else icon.style.marginRight = 'auto';
  paperItem.innerText = item;
  paperItem.appendChild(icon);
  paperItem.addEventListener('click', () => {
    header[item.toLowerCase()].dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
  });
  icon.addEventListener('click', () => {
    header[item.toLowerCase()].dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
  });
  header.options.querySelector('paper-listbox').appendChild(paperItem);
};

const showEditor = haElem => {
  window.scrollTo(0, 0);
  if (!haElem.root.querySelector('ha-app-layout editor')) {
    const container = document.createElement('editor');
    const nest = document.createElement('div');
    nest.style.cssText = `
      padding: 20px;
      max-width: 600px;
      margin: 15px auto;
      background: var(--paper-card-background-color);
      border: 6px solid var(--paper-card-background-color);
    `;
    container.style.cssText = `
      width: 100%;
      min-height: 100%;
      box-sizing: border-box;
      position: absolute;
      background: var(--background-color, grey);
      z-index: 101;
      padding: 5px;
    `;
    haElem.root.querySelector('ha-app-layout').insertBefore(container, haElem.root.querySelector('#view'));
    container.appendChild(nest);
    nest.appendChild(document.createElement('custom-header-editor'));
  }
};

export const insertSettings = (header, config, haElem) => {
  function insertAfter(el, referenceNode) {
    referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
  }
  if (haElem.lovelace.mode === 'storage' && !config.hide_ch_settings) {
    if (header.options.querySelector('paper-listbox').querySelector('#ch_settings')) {
      header.options
        .querySelector('paper-listbox')
        .querySelector('#ch_settings')
        .remove();
    }
    const chSettings = document.createElement('paper-item');
    chSettings.setAttribute('id', 'ch_settings');
    chSettings.addEventListener('click', () => showEditor(haElem));
    chSettings.innerHTML = 'Custom Header';
    const paperItems = header.options.querySelector('paper-listbox').querySelectorAll('paper-item');
    const paperItemsHA = haElem.options.querySelector('paper-listbox').querySelectorAll('paper-item');
    if (!header.options.querySelector('paper-listbox').querySelector('#ch_settings')) {
      insertAfter(chSettings, paperItems[paperItems.length - 1]);
    }
    if (!haElem.options.querySelector('paper-listbox').querySelector('#ch_settings')) {
      insertAfter(chSettings, paperItemsHA[paperItemsHA.length - 1]);
    }
  }
};
