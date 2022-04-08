$(function () {
    console.log("AHHelper JS Started!")

    var warpper = $("<div>").addClass("ahh-wrapper").html("疫苗助手加载成功");
    $("body").prepend(warpper);
    setInterval(function () {
        worker()
    }, 3000);


    function worker() {
        closeModalIfNeeded() ||
            selectDateAndTime() ||
            inputUserInfo() ||
            finalStep()
    }


    // 关闭接种弹窗
    // restart
    // false: 继续执行
    // true: 重新执行
    function closeModalIfNeeded() {

        // 无弹窗
        if ($(".modal-wrapper:visible").length == 0) {
            return false
        }

        $(".modal-wrapper:visible").each(function () {
            var text = $(this).text()
            if (text.includes("接种须知")) {
                // $(this).hide()
                $(this).find(".modal-btn-content").each(function () {
                    var btnText = $(this).text()
                    if (btnText.includes("知晓并同意")) {
                        notice("关闭接种须知弹窗")
                        $(this).click()
                    }
                })
            }
        });

        return true
    }


    // 选择接种时间
    function selectDateAndTime() {
        // 已选择日期时间
        if ($(".show-selected-time").length > 0) {
            return false
        }

        // 选择时间
        if (selectTime()) {
            // 选择时间成功，重新执行
            return true
        }
        return selectDate()
    }


    // 选择接种日期
    function selectDate() {
        notice("查找可预约接种日期")
        var days = $(".vtm-calendar-count").length

        if (days == 0) {
            notice("无可用接种日期")
            // 重新请求 等待可用日期
            return true
        }

        // 选择日期，重新运行
        $(".vtm-calendar-count").first().click()
        return true
    }
    
    // 选择接种时间
    function selectTime() {
        var success = false
        notice("查找可预约接种时间")
        $(".time-block").each(function () {
            if ($(this).text().includes("可约") && !success) {
                $(this).click()
                success = true
                notice("查找可预约接种时间成功")
                setTimeout(() => {
                    notice("可预约接种时间确认")
                    $(".time-picker-confirm-btn").click()
                }, 1000);
            }
        })

        return success
    }


    // 填写用户信息
    function inputUserInfo() {
        if ($(".vaccine-info .info-add-input").length == 0) {
            notice("无可填写接种人信息")
            return true
        }

        $(".vaccine-info .info-add-input").each(function() {
            var label = $(this).text()
            if (label.includes("姓名")) {
                $(this).find("input").first().val("文轩")
            } else if (label.includes("电话")) {
                $(this).find("input").first().val("13000000000")
            }
        })

        return false
    }

    // 兜底步骤
    function finalStep() {
        notice(new Date().toLocaleString())
        return true
    }


    // 显示消息
    function notice(msg) {
        console.log(msg)
        $(".ahh-wrapper").html(msg);
    }
});