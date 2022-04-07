$(function () {
    console.log("AHHelper JS Started!")

    warpper = $("<div>").addClass("ahh-wrapper").html("疫苗助手加载成功");
    $("body").prepend(warpper);
    setInterval(function () {
        worker()
    }, 3000);


    function worker() {
        closeModalIfNeeded() || finalStep()
    }


    // 关闭弹窗
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