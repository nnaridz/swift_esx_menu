OpenedMenus = {}
ActiveTimeouts = {}
local GUI = { Time = 0, HoldTime = 0 }

function GetOpenedMenuCount()
    local count = 0
    for _, open in pairs(OpenedMenus) do
        if open then count = count + 1 end
    end
    return count
end

function RecheckNuiFocus()
    local hasKeyboardMenu = false
    for k, v in pairs(OpenedMenus) do
        if v then
            -- Dialog and list menus require keyboard/mouse focus
            if string.sub(k, 1, 6) == "dialog" or string.sub(k, 1, 4) == "list" then
                hasKeyboardMenu = true
                break
            end
        end
    end

    if hasKeyboardMenu then
        SetNuiFocus(true, true)
    else
        SetNuiFocus(false, false)
    end
end

local disableTicks = 0

CreateThread(function()
    while true do
        local openedCount = GetOpenedMenuCount()
        if openedCount > 0 then
            disableTicks = 10
        end

        if disableTicks > 0 then
            if openedCount == 0 then
                disableTicks = disableTicks - 1
            end
            

            local hasKeyboardMenu = false
            for k, v in pairs(OpenedMenus) do
                if v then
                    if string.sub(k, 1, 6) == "dialog" or string.sub(k, 1, 4) == "list" then
                        hasKeyboardMenu = true
                        break
                    end
                end
            end

            if hasKeyboardMenu then
                DisableControlAction(0, 1,   true) -- LookLeftRight
                DisableControlAction(0, 2,   true) -- LookUpDown
                DisableControlAction(0, 142, true) -- MeleeAttackAlternate
                DisableControlAction(0, 106, true) -- VehicleMouseControlOverride
                DisableControlAction(0, 12,  true) -- WeaponWheelUpDown
                DisableControlAction(0, 14,  true) -- WeaponWheelNext
                DisableControlAction(0, 15,  true) -- WeaponWheelPrev
                DisableControlAction(0, 16,  true) -- SelectNextWeapon
                DisableControlAction(0, 17,  true) -- SelectPrevWeapon
            end


            DisableControlAction(0, 172, true) -- UP
            DisableControlAction(0, 173, true) -- DOWN
            DisableControlAction(0, 174, true) -- LEFT
            DisableControlAction(0, 175, true) -- RIGHT
            DisableControlAction(0, 176, true) -- ENTER
            DisableControlAction(0, 177, true) -- BACKSPACE
            DisableControlAction(0, 194, true) -- ESCAPE
            DisableControlAction(0, 201, true) -- ENTER (alternative)
            

            DisableControlAction(0, 199, true) -- FRONTEND_PAUSE
            DisableControlAction(0, 200, true) -- FRONTEND_PAUSE_ALTERNATE
            DisableControlAction(1, 199, true)
            DisableControlAction(1, 200, true)
            DisableControlAction(2, 199, true)
            DisableControlAction(2, 200, true)

            Wait(0)
        else
            Wait(250)
        end
    end
end)


local lastArrowTime = 0
CreateThread(function()
    while true do
        local openedCount = GetOpenedMenuCount()
        if openedCount > 0 then
            disableTicks = 10

            local hasKeyboardMenu = false
            for k, v in pairs(OpenedMenus) do
                if v then
                    if string.sub(k, 1, 6) == "dialog" or string.sub(k, 1, 4) == "list" then
                        hasKeyboardMenu = true
                        break
                    end
                end
            end

            if not hasKeyboardMenu or not IsInputDisabled(2) then
                if IsDisabledControlJustPressed(0, 177) or IsDisabledControlJustPressed(0, 194) then -- Backspace / Escape
                    SendNUIMessage({ action = "controlPressed", control = "BACKSPACE" })
                elseif IsDisabledControlJustPressed(0, 176) or IsDisabledControlJustPressed(0, 201) then -- Enter
                    SendNUIMessage({ action = "controlPressed", control = "ENTER" })
                else
                    local control = nil
                    if IsDisabledControlPressed(0, 172) or IsDisabledControlPressed(0, 27) then
                        control = "TOP"
                    elseif IsDisabledControlPressed(0, 173) or IsDisabledControlPressed(0, 28) then
                        control = "DOWN"
                    elseif IsDisabledControlPressed(0, 174) or IsDisabledControlPressed(0, 29) then
                        control = "LEFT"
                    elseif IsDisabledControlPressed(0, 175) or IsDisabledControlPressed(0, 30) then
                        control = "RIGHT"
                    end

                    if control then
                        local currentTime = GetGameTimer()
                        local delay = 200
                        if GUI.HoldTime > 8 then
                            delay = 30
                        elseif GUI.HoldTime > 3 then
                            delay = 70
                        end

                        if currentTime - lastArrowTime >= delay then
                            SendNUIMessage({ action = "controlPressed", control = control })
                            GUI.HoldTime = GUI.HoldTime + 1
                            lastArrowTime = currentTime
                        end
                    else
                        GUI.HoldTime = 0
                    end
                end
            end
            Wait(0)
        else
            GUI.HoldTime = 0
            Wait(250)
        end
    end
end)


AddEventHandler("onResourceStop", function(resource)
    if GetCurrentResourceName() == resource and GetOpenedMenuCount() > 0 then
        ESX.UI.Menu.CloseAll()
    end
end)

RegisterNUICallback("menu_submit", function(data, cb)
    if Config.Debug then print("[swift_esx_menu] NUI menu_submit called with namespace:", data._namespace, "name:", data._name) end
    local menu = ESX.UI.Menu.GetOpened("default", data._namespace, data._name)
    local mType = "default"
    if not menu then
        menu = ESX.UI.Menu.GetOpened("list", data._namespace, data._name)
        mType = "list"
    end
    if not menu then
        menu = ESX.UI.Menu.GetOpened("dialog", data._namespace, data._name)
        mType = "dialog"
    end

    if Config.Debug then print("[swift_esx_menu] GetOpened found menu:", menu ~= nil, "type:", mType) end

    if menu then
        if mType == "dialog" then
            if menu.submit then
                local post = true
                if tonumber(data.value) ~= nil then
                    data.value = ESX.Math.Round(tonumber(data.value))
                    if tonumber(data.value) <= 0 then
                        post = false
                    end
                end
                data.value = ESX.Math.Trim(data.value)
                if post then
                    menu.submit(data, menu)
                else
                    ESX.ShowNotification("Invalid input!")
                end
            end
        else
            if menu.submit then
                menu.submit(data, menu)
            end
        end
    end
    cb("OK")
end)

RegisterNUICallback("menu_cancel", function(data, cb)
    if Config.Debug then print("[swift_esx_menu] NUI menu_cancel called with namespace:", data._namespace, "name:", data._name) end
    local menu = ESX.UI.Menu.GetOpened("default", data._namespace, data._name)
    if not menu then
        menu = ESX.UI.Menu.GetOpened("list", data._namespace, data._name)
    end
    if not menu then
        menu = ESX.UI.Menu.GetOpened("dialog", data._namespace, data._name)
    end

    if menu and menu.cancel then
        menu.cancel(data, menu)
    end
    cb("OK")
end)

RegisterNUICallback("menu_change", function(data, cb)
    local menu = ESX.UI.Menu.GetOpened("default", data._namespace, data._name)
    local mType = "default"
    if not menu then
        menu = ESX.UI.Menu.GetOpened("list", data._namespace, data._name)
        mType = "list"
    end
    if not menu then
        menu = ESX.UI.Menu.GetOpened("dialog", data._namespace, data._name)
        mType = "dialog"
    end

    if menu then
        if mType == "default" and data.elements then
            for i = 1, #data.elements, 1 do
                if data.elements[i] then
                    menu.setElement(i, "value", data.elements[i].value)
                    menu.setElement(i, "selected", data.elements[i].selected)
                end
            end
        end
        if menu.change then
            menu.change(data, menu)
        end
    end
    cb("OK")
end)
