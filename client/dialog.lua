local MenuType = "dialog"

local function openMenu(namespace, name, data)
    local menuId = MenuType .. "_" .. namespace .. "_" .. name
    OpenedMenus[menuId] = true

    if ActiveTimeouts[menuId] then
        ClearTimeout(ActiveTimeouts[menuId])
        ActiveTimeouts[menuId] = nil
    end

    SendNUIMessage({
        action = "openMenu",
        type = MenuType,
        namespace = namespace,
        name = name,
        data = data
    })

    RecheckNuiFocus()

    ActiveTimeouts[menuId] = SetTimeout(150, function()
        ActiveTimeouts[menuId] = nil
        RecheckNuiFocus()
    end)
end

local function closeMenu(namespace, name)
    local menuId = MenuType .. "_" .. namespace .. "_" .. name
    OpenedMenus[menuId] = nil

    if ActiveTimeouts[menuId] then
        ClearTimeout(ActiveTimeouts[menuId])
        ActiveTimeouts[menuId] = nil
    end

    SendNUIMessage({
        action = "closeMenu",
        type = MenuType,
        namespace = namespace,
        name = name
    })

    RecheckNuiFocus()
end

ESX.UI.Menu.RegisterType(MenuType, openMenu, closeMenu)

