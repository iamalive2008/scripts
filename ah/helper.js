$(function () {
    console.log("AHHelper JS Started!")

    warpper = $("<div>").addClass("ahh-wrapper").html("疫苗助手加载成功");
    $("body").prepend(warpper);
    setInterval(function () {
        worker()
    }, 3000);


    function worker() {
        closeModalIfNeeded() ||
            selectDate() ||
            finalStep()
    }


    // 关闭接种弹窗
    function closeModalIfNeeded() {

        if ($(".modal-wrapper:visible").length == 0) {
            return false
        }

        $(".modal-wrapper:visible").each(function () {
            text = $(this).text()
            if (text.includes("接种须知")) {
                // $(this).hide()
                $(this).find(".modal-btn-content").each(function () {
                    btnText = $(this).text()
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
    function selectDate() {

        if (selectTime()) {
            return true
        }


        notice("查找可预约接种日期")
        days = $(".vtm-calendar-count").length

        if (days == 0) {
            notice("无可用接种日期")
            return false
        }

        $(".vtm-calendar-count").first().click()
        return true
    }



      // 选择接种时间
      function selectTime() {

        success = false

        notice("查找可预约接种时间")
        $(".time-block").each(function () {
            if ($(this).text().includes("可约") && !success) {
                $(this).click()
                success = true
                setTimeout(() => {
                    $("time-picker-confirm-btn").click()
                }, 1000);
            }
        })

        return success
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