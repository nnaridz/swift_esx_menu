(function () {
    window.ESX_MENU = {};
    ESX_MENU.ResourceName = 'swift_esx_menu';
    ESX_MENU.opened = {};
    ESX_MENU.focus = [];
    ESX_MENU.pos = {};

    ESX_MENU.open = function (type, namespace, name, data) {
        if (typeof ESX_MENU.opened[namespace] === 'undefined') {
            ESX_MENU.opened[namespace] = {};
        }

        if (typeof ESX_MENU.opened[namespace][name] !== 'undefined') {
            ESX_MENU.close(namespace, name);
        }

        if (typeof ESX_MENU.pos[namespace] === 'undefined') {
            ESX_MENU.pos[namespace] = {};
        }

        if (data.elements) {
            for (let i = 0; i < data.elements.length; i++) {
                if (typeof data.elements[i].type === 'undefined') {
                    data.elements[i].type = 'default';
                }
            }
        }

        data._type = type;
        data._namespace = namespace;
        data._name = name;

        ESX_MENU.opened[namespace][name] = data;
        ESX_MENU.pos[namespace][name] = 0;

        if (data.elements) {
            for (let i = 0; i < data.elements.length; i++) {
                if (data.elements[i].selected) {
                    ESX_MENU.pos[namespace][name] = i;
                } else {
                    data.elements[i].selected = false;
                }
            }
        }

        ESX_MENU.focus.push({ type, namespace, name });
        ESX_MENU.render();
    };

    ESX_MENU.close = function (namespace, name) {
        if (ESX_MENU.opened[namespace]) {
            delete ESX_MENU.opened[namespace][name];
        }

        let found = false;
        for (let i = 0; i < ESX_MENU.focus.length; i++) {
            if (ESX_MENU.focus[i].namespace === namespace && ESX_MENU.focus[i].name === name) {
                ESX_MENU.focus.splice(i, 1);
                found = true;
                break;
            }
        }

        if (found) ESX_MENU.render();
    };

    ESX_MENU.getFocused = function () {
        return ESX_MENU.focus[ESX_MENU.focus.length - 1];
    };

    ESX_MENU.submit = function (namespace, name, data, type) {
        if (type === 'dialog') {
            $.post(`https://${ESX_MENU.ResourceName}/menu_submit`, JSON.stringify({
                _namespace: namespace, _name: name, value: data
            }));
        } else if (type === 'list') {
            $.post(`https://${ESX_MENU.ResourceName}/menu_submit`, JSON.stringify({
                _namespace: namespace, _name: name, data: data.data, value: data.value
            }));
        } else {
            $.post(`https://${ESX_MENU.ResourceName}/menu_submit`, JSON.stringify({
                _namespace: namespace, _name: name, current: data,
                elements: ESX_MENU.opened[namespace][name].elements
            }));
        }
    };

    ESX_MENU.cancel = function (namespace, name) {
        $.post(`https://${ESX_MENU.ResourceName}/menu_cancel`, JSON.stringify({
            _namespace: namespace, _name: name
        }));
    };

    ESX_MENU.change = function (namespace, name, data) {
        $.post(`https://${ESX_MENU.ResourceName}/menu_change`, JSON.stringify({
            _namespace: namespace, _name: name, current: data,
            elements: ESX_MENU.opened[namespace][name].elements
        }));
    };

    function renderElements(targetContainer, elements, focused) {
        const $target = $(targetContainer);
        elements.forEach((elem, index) => {
            const isSelected = index === ESX_MENU.pos[focused.namespace][focused.name];
            let valHtml;

            if (elem.type === 'slider') {
                const sliderLabel = (typeof elem.options === 'undefined') ? elem.value : elem.options[elem.value];
                valHtml = `
                    <div class="slider-controls">
                        <i class="fa-solid fa-chevron-left js-slider-left" data-index="${index}"></i>
                        <span>${sliderLabel}</span>
                        <i class="fa-solid fa-chevron-right js-slider-right" data-index="${index}"></i>
                    </div>
                `;
            } else {
                valHtml = `<i class="fa-solid fa-chevron-right" style="color: rgba(255, 255, 255, 0.25); font-size: 14px;"></i>`;
            }

            const $item = $(`
                <div class="menu-item-row ${isSelected ? 'selected' : ''}">
                    <p class="item-label">${elem.label}</p>
                    <div class="item-value">${valHtml}</div>
                </div>
            `);

            $item.on('click', () => {
                if (ESX_MENU.pos[focused.namespace][focused.name] === index) {
                    ESX_MENU.submit(focused.namespace, focused.name, elem, 'default');
                } else {
                    ESX_MENU.pos[focused.namespace][focused.name] = index;
                    elements.forEach((el, idx) => el.selected = (idx === index));
                    ESX_MENU.change(focused.namespace, focused.name, elem);
                    ESX_MENU.render();
                }
            });

            $target.append($item);
        });

        const $selected = $target.find('.menu-item-row.selected');
        if ($selected.length) {
            $selected[0].scrollIntoView({ block: 'center' });
        }
    }

    ESX_MENU.render = function () {
        const focused = ESX_MENU.getFocused();
        const $default = $('#menu-default');
        const $list = $('#menu-list');
        const $dialog = $('#menu-dialog-overlay');

        if (!focused) {
            $default.removeClass('active');
            $list.removeClass('active');
            $dialog.removeClass('active');
            ESX_MENU.prevFocusLength = 0;
            return;
        }

        const menuData = ESX_MENU.opened[focused.namespace][focused.name];
        if (!menuData) return;

        const currentFocusLength = ESX_MENU.focus.length;
        let animClass = '';
        if (ESX_MENU.prevFocusLength && ESX_MENU.prevFocusLength > 0 && currentFocusLength > 0 && ESX_MENU.prevFocusLength !== currentFocusLength) {
            animClass = currentFocusLength > ESX_MENU.prevFocusLength ? 'slide-in-right' : 'slide-in-left';
        }
        ESX_MENU.prevFocusLength = currentFocusLength;

        if (focused.type === 'default') {
            $list.removeClass('active');
            $dialog.removeClass('active');
            $default.addClass('active');


            $default[0].className = $default[0].className.replace(/\balign-\S+/g, '').trim();
            $default.addClass('align-' + (menuData.align || 'top-left'));

            $('#default-title-top').text(menuData.title || 'Topic Name');
            $('#default-title-bottom').text(menuData.title || 'Menu');

            const $wrapper = $('.menu-items-wrapper');
            const $container = $('#default-items-container');

            if (animClass && $container.length) {
                $wrapper.removeClass('slide-in slide-back');

                const $old = $container;
                $old.removeAttr('id').css({ position: 'absolute', top: 0, left: 0, width: '100%' });
                $old.attr('class', 'menu-items-list ' + (animClass === 'slide-in-right' ? 'slide-out-left' : 'slide-out-right'));

                const $new = $('<div>', { class: 'menu-items-list ' + animClass, id: 'default-items-container' });
                renderElements($new[0], menuData.elements, focused);
                $wrapper.append($new);

                setTimeout(() => $old.remove(), 260);
            } else {
                if ($container.length) {
                    $container.empty();
                    renderElements($container[0], menuData.elements, focused);
                }
            }

            updateScrollIndicators();
        }
        else if (focused.type === 'list') {
            $default.removeClass('active');
            $dialog.removeClass('active');
            $list.addClass('active');

            $('#list-title-top').text(menuData.title || 'Topic Name');
            $('#list-title-bottom').text(menuData.title || 'Menu');

            const $headerRow = $('#list-table-header').empty();
            menuData.head.forEach(text => $headerRow.append($('<th>').text(text)));

            const $body = $('#list-table-body').empty();
            menuData.rows.forEach((row, rowIndex) => {
                const $tr = $('<tr>');
                row.cols.forEach(colContent => {
                    const $td = $('<td>');
                    const regex = /\{\{(.*?)\|(.*?)\}\}/g;
                    let matches = [], match;
                    while ((match = regex.exec(String(colContent))) !== null) matches.push(match);

                    if (matches.length > 0) {
                        $td.css('white-space', 'nowrap');
                        matches.forEach(m => {
                            const btnText = m[1].toLowerCase();
                            const btnValue = m[2];
                            const $btn = $('<button>', { class: 'table-btn' });

                            if (btnValue === 'view' || btnText === 'view') {
                                $btn.html('<i class="fa-regular fa-eye"></i> <span>' + m[1] + '</span>').attr('title', 'View');
                            } else if (btnValue === 'edit' || btnText === 'edit') {
                                $btn.html('<i class="fa-regular fa-pen-to-square"></i> <span>' + m[1] + '</span>').attr('title', 'Edit');
                            } else if (btnValue === 'delete' || btnText === 'delete') {
                                $btn.html('<i class="fa-regular fa-trash-can"></i> <span>' + m[1] + '</span>').addClass('btn-danger').attr('title', 'Delete');
                            } else {
                                $btn.text(m[1]);
                            }

                            $btn.on('click', function (e) {
                                e.stopPropagation();
                                if (row.data) row.data.currentRow = rowIndex + 1;
                                ESX_MENU.submit(focused.namespace, focused.name, { data: row.data, value: btnValue }, 'list');
                                ESX_MENU.close(focused.namespace, focused.name);
                            });
                            $td.append($btn);
                        });
                    } else {
                        $td.html(`<span style="font-weight: 500; color: rgba(255, 255, 255, 0.9);">${colContent}</span>`);
                    }

                    $tr.append($td);
                });
                $body.append($tr);
            });
        }
        else if (focused.type === 'dialog') {
            $default.removeClass('active');
            $list.removeClass('active');
            $dialog.addClass('active');

            $('#dialog-title-text').text(menuData.title || 'Input Custom Amount');
            const $input = $('#dialog-input-field').val(menuData.value || '');
            setTimeout(() => $input.trigger('focus'), 80);
        }
    };

    function adjustSlider(index, direction) {
        const focused = ESX_MENU.getFocused();
        if (!focused || focused.type !== 'default') return;

        const menuData = ESX_MENU.opened[focused.namespace][focused.name];
        const elem = menuData.elements[index];
        if (elem.type !== 'slider') return;

        if (direction === -1) {
            const min = (typeof elem.min === 'undefined') ? 0 : elem.min;
            if (elem.value > min) {
                elem.decimal ? (elem.value -= elem.decimal) : elem.value--;
                ESX_MENU.change(focused.namespace, focused.name, elem);
            }
        } else {
            if (typeof elem.options !== 'undefined' && elem.value < elem.options.length - 1) {
                elem.decimal ? (elem.value += elem.decimal) : elem.value++;
                ESX_MENU.change(focused.namespace, focused.name, elem);
            } else if (typeof elem.max !== 'undefined' && elem.value < elem.max) {
                elem.decimal ? (elem.value += elem.decimal) : elem.value++;
                ESX_MENU.change(focused.namespace, focused.name, elem);
            }
        }
        ESX_MENU.render();
    }

    function updateScrollIndicators() {
        const container = document.getElementById('default-items-container');
        if (!container) return;
        const $wrapper = $(container).parent();
        if (!$wrapper.length) return;

        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        $wrapper.toggleClass('has-scroll-top', scrollTop > 2);
        $wrapper.toggleClass('has-scroll-bottom', (scrollHeight - clientHeight - scrollTop) > 2);
    }

    $('#dialog-submit-btn').on('click', () => {
        const focused = ESX_MENU.getFocused();
        if (focused && focused.type === 'dialog') {
            const val = $('#dialog-input-field').val();
            ESX_MENU.submit(focused.namespace, focused.name, val, 'dialog');
            ESX_MENU.close(focused.namespace, focused.name);
        }
    });

    $('#dialog-cancel-btn, #dialog-close-icon-btn').on('click', () => {
        const focused = ESX_MENU.getFocused();
        if (focused) {
            ESX_MENU.cancel(focused.namespace, focused.name);
            ESX_MENU.close(focused.namespace, focused.name);
        }
    });

    ESX_MENU.onControlPressed = function (control) {
        const focused = ESX_MENU.getFocused();
        if (!focused) return;

        const menuData = ESX_MENU.opened[focused.namespace][focused.name];
        if (!menuData) return;

        if (control === 'ENTER') {
            if (focused.type === 'default') {
                const pos = ESX_MENU.pos[focused.namespace][focused.name];
                if (menuData.elements.length > 0) {
                    ESX_MENU.submit(focused.namespace, focused.name, menuData.elements[pos], 'default');
                }
            } else if (focused.type === 'dialog') {
                const val = $('#dialog-input-field').val();
                ESX_MENU.submit(focused.namespace, focused.name, val, 'dialog');
                ESX_MENU.close(focused.namespace, focused.name);
            }
        }
        else if (control === 'BACKSPACE') {
            ESX_MENU.cancel(focused.namespace, focused.name);
            ESX_MENU.close(focused.namespace, focused.name);
        }
        else if (control === 'TOP' && focused.type === 'default') {
            const pos = ESX_MENU.pos[focused.namespace][focused.name];
            ESX_MENU.pos[focused.namespace][focused.name] = pos > 0 ? pos - 1 : menuData.elements.length - 1;
            const elem = menuData.elements[ESX_MENU.pos[focused.namespace][focused.name]];
            menuData.elements.forEach((el, idx) => el.selected = (idx === ESX_MENU.pos[focused.namespace][focused.name]));
            ESX_MENU.change(focused.namespace, focused.name, elem);
            ESX_MENU.render();
        }
        else if (control === 'DOWN' && focused.type === 'default') {
            const pos = ESX_MENU.pos[focused.namespace][focused.name];
            ESX_MENU.pos[focused.namespace][focused.name] = pos < menuData.elements.length - 1 ? pos + 1 : 0;
            const elem = menuData.elements[ESX_MENU.pos[focused.namespace][focused.name]];
            menuData.elements.forEach((el, idx) => el.selected = (idx === ESX_MENU.pos[focused.namespace][focused.name]));
            ESX_MENU.change(focused.namespace, focused.name, elem);
            ESX_MENU.render();
        }
        else if (control === 'LEFT' && focused.type === 'default') {
            adjustSlider(ESX_MENU.pos[focused.namespace][focused.name], -1);
        }
        else if (control === 'RIGHT' && focused.type === 'default') {
            adjustSlider(ESX_MENU.pos[focused.namespace][focused.name], 1);
        }
    };

    $(window).on('message', (event) => {
        const data = event.originalEvent.data;
        if (data.action === 'openMenu') {
            ESX_MENU.open(data.type, data.namespace, data.name, data.data);
        } else if (data.action === 'closeMenu') {
            ESX_MENU.close(data.namespace, data.name);
        } else if (data.action === 'controlPressed') {
            ESX_MENU.onControlPressed(data.control);
        }
    });

    $(window).on('keydown', (event) => {
        const focused = ESX_MENU.getFocused();
        if (!focused) return;

        const isStandalone = !window.invokeNative && !navigator.userAgent.includes('CitizenFX');

        if (focused.type === 'dialog' || focused.type === 'list') {
            if (focused.type === 'dialog' && event.key === 'Enter') {
                event.preventDefault();
                const val = $('#dialog-input-field').val();
                ESX_MENU.submit(focused.namespace, focused.name, val, 'dialog');
                ESX_MENU.close(focused.namespace, focused.name);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                ESX_MENU.cancel(focused.namespace, focused.name);
                ESX_MENU.close(focused.namespace, focused.name);
            }
            if (focused.type === 'dialog') return;
        }

        if (isStandalone) {
            const keyMap = { ArrowUp: 'TOP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Enter: 'ENTER', Backspace: 'BACKSPACE', Escape: 'BACKSPACE' };
            const control = keyMap[event.key];
            if (control) {
                event.preventDefault();
                ESX_MENU.onControlPressed(control);
            }
        }
    });
})();
