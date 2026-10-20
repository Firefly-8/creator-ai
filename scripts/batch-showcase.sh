#!/usr/bin/env bash
# 批量合成首页 showcase 成品图
#
# ⚠️ 注意参数传递：必须用 shift + "$@"。
#    早期版本用 ${@:2}，bash 展开时丢了引号，消息被按空格切词
#    （"Eighty years of you..." 只传进了 "Eighty"），成品上只剩一个词。
set -euo pipefail
cd "$(dirname "$0")/.."

B="${1:-/workspace/output/showcase2}"
O="${2:-public/showcase}"
mkdir -p "$O"

run() {
  local name="$1"; shift
  node scripts/compose-card.mjs --bg "$B/$name.jpg" --out "$O/$name.jpg" "$@"
}

run hero-birthday --name "Margaret" --message "Happy 80th Birthday! Wishing you the happiest year yet, with all our love." --signature "The Watson family"
run person-mum --name "Mum" --message "Thank you for everything, always. Happy Mother's Day." --signature "Emma & Tom"
run person-dad --name "Dad" --message "Happy Father's Day, Dad. Thank you for all you do for us." --signature "With love, the family"
run person-grandma --name "Margaret" --message "Eighty years of you. We love you more than words can say." --signature "The Watson family"
run person-grandpa --name "Jim" --message "Seventy years young! Happy birthday, Dad." --signature "The Watsons"
run person-friend --name "Thank you, Ruth" --message "For everything you did for me this year. I never forget." --signature "With love, Hannah"
run person-partner --name "Our 25th" --message "Twenty-five years of you - here's to many more." --signature "Always yours"
run person-teacher --name "Thank you, Mrs Clarke" --message "Thirty years of teaching us. You changed our lives." --signature "Class of '95"
run person-pet --name "Biscuit" --message "Happy Birthday to the best dog in the whole world." --signature "The Watson family"
run scene-christmas --name "Merry Christmas" --message "Wishing you a warm and wonderful Christmas, with all our love." --signature "The Watsons"
run scene-thankyou-parent --name "Get well soon" --message "Rest up and take your time. We're thinking of you every day." --signature "The family"
run scene-wallart --no-band
