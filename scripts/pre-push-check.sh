#!/bin/bash
# 推送前检查脚本 — 捕获低级错误
# 用法: bash scripts/pre-push-check.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

echo "🔍 推送前检查开始..."
echo ""

# 1. 构建检查
echo "📦 [1/4] 构建检查..."
if npm run build 2>&1 | tail -5 | grep -q "Build complete"; then
    echo -e "   ${GREEN}✅ 构建通过${NC}"
else
    echo -e "   ${RED}❌ 构建失败${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. SSR 渲染检查
echo "🌐 [2/4] SSR 渲染检查..."
npx wrangler pages dev dist --port 5175 > /tmp/wrangler.log 2>&1 &
WRANGLER_PID=$!
sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ 首页 HTTP 200${NC}"
else
    echo -e "   ${RED}❌ 首页 HTTP $HTTP_CODE${NC}"
    ERROR_MSG=$(curl -s http://localhost:5175/ 2>/dev/null | grep -o '"message":"[^"]*"' | head -1)
    echo -e "   ${RED}   错误: $ERROR_MSG${NC}"
    ERRORS=$((ERRORS + 1))
fi

kill $WRANGLER_PID 2>/dev/null
echo ""

# 3. 插件上下文检查
echo "🔌 [3/4] 插件上下文检查..."
PLUGIN_ISSUES=0

for file in plugins/*.ts; do
    if [ -f "$file" ]; then
        if grep -q "defineNuxtPlugin(async" "$file"; then
            if grep -q "useI18n()\|useCookie()\|useAuthModal()\|useAuth()" "$file"; then
                echo -e "   ${YELLOW}⚠️  $file: async 插件中包含 composable 调用${NC}"
                PLUGIN_ISSUES=$((PLUGIN_ISSUES + 1))
            fi
        fi
    fi
done

if [ $PLUGIN_ISSUES -eq 0 ]; then
    echo -e "   ${GREEN}✅ 插件上下文无问题${NC}"
else
    echo -e "   ${RED}❌ 发现 $PLUGIN_ISSUES 个插件上下文问题${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. i18n key 检查
echo "🌍 [4/4] i18n key 检查..."
I18N_ISSUES=0

# 收集所有模板文件
TEMPLATE_FILES=$(find pages layouts components -name "*.vue" 2>/dev/null)
for file in $TEMPLATE_FILES; do
    if [ -f "$file" ]; then
        # 提取 $t('...') 中的 key
        KEYS=$(grep -o "\\$t('[^']*')" "$file" 2>/dev/null | sed "s/\\\$t('//;s/'$//" || true)
        for key in $KEYS; do
            # 跳过带参数的 key（包含括号）
            if echo "$key" | grep -q "("; then
                continue
            fi
            # 检查 key 是否存在于 en.json
            if ! grep -q "\"$key\"" locales/en.json 2>/dev/null; then
                echo -e "   ${YELLOW}⚠️  $file: key '$key' 未在 en.json 中找到${NC}"
                I18N_ISSUES=$((I18N_ISSUES + 1))
            fi
        done
    fi
done

if [ $I18N_ISSUES -eq 0 ]; then
    echo -e "   ${GREEN}✅ i18n key 检查通过${NC}"
else
    echo -e "   ${YELLOW}⚠️  发现 $I18N_ISSUES 个缺失 key${NC}"
fi
echo ""

# 总结
echo "=============================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查通过，可以推送！${NC}"
    exit 0
else
    echo -e "${RED}❌ 发现 $ERRORS 个问题，请修复后再推送${NC}"
    exit 1
fi
