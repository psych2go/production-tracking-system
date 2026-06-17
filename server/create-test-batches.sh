#!/bin/bash
# 创建50个测试批次（25个产品批次 + 25个试验批次）
# 用法：确保 server 已启动（npm run dev），然后运行此脚本

set -e
BASE="http://localhost:3000/api"

# 登录获取 token
TOKEN=$(curl -s -X POST "$BASE/auth/dev-login" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"

# 封装形式列表
PKGS=("DIP8L" "SOP8L" "SOP14L" "SOP16L" "LQFP32L" "LQFP44L" "SSOP20L (0.65)" "QFN64L")
# 客户代码列表
CODES=("HIC" "SJ" "XIC" "JSC20" "JSC21" "GS01-J" "LN02-J" "ZD47")
# 产品型号列表
MODELS=("HT7133" "HT7136" "HT7533" "HT7550" "HT46R064" "HT45F75" "HT32F52231" "HT32F52352" "HT8A19D" "HT85F2260")

echo "Creating 25 product batches..."
for i in $(seq 1 25); do
  MODEL=${MODELS[$((RANDOM % ${#MODELS[@]}))]}
  PKG=${PKGS[$((RANDOM % ${#PKGS[@]}))]}
  CODE=${CODES[$((RANDOM % ${#CODES[@]}))]}
  QTY=$((RANDOM % 5000 + 500))
  PRIORITY=$([ $((RANDOM % 5)) -eq 0 ] && echo "urgent" || echo "normal")

  curl -s -X POST "$BASE/batches" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{
      \"batchType\": \"product\",
      \"batchNo\": \"P2026-0424-$(printf '%03d' $i)\",
      \"productModel\": \"$MODEL\",
      \"quantity\": $QTY,
      \"packageType\": \"$PKG\",
      \"customerCode\": \"$CODE\",
      \"orderNo\": \"ORD-$(printf '%04d' $((1000+i)))\",
      \"customerDelivery\": \"2026-05-$((10 + RANDOM % 20))\",
      \"productionDelivery\": \"2026-05-$((5 + RANDOM % 15))\",
      \"priority\": \"$PRIORITY\",
      \"notes\": \"测试批次 #$i\"
    }" | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'  [{i}/25] {d.get(\"batchNo\",\"ERROR\")}: {d.get(\"product\",{}).get(\"model\",d.get(\"error\",\"?\"))}')" 2>/dev/null || echo "  [$i] FAILED"
done

echo ""
echo "Creating 25 trial batches..."
for i in $(seq 1 25); do
  PKG=${PKGS[$((RANDOM % ${#PKGS[@]}))]}
  QTY=$((RANDOM % 500 + 50))
  TIAO=$((RANDOM % 200 + 20))

  curl -s -X POST "$BASE/batches" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{
      \"batchType\": \"trial\",
      \"trialContent\": \"试验 #$i - 温度/压力测试\",
      \"packageType\": \"$PKG\",
      \"quantity\": $QTY,
      \"quantityDetail\": \"{\\\"条\\\":$TIAO,\\\"只\\\":$QTY}\",
      \"customerDelivery\": \"2026-05-$((10 + RANDOM % 20))\",
      \"notes\": \"自动测试试验批次 #$i\"
    }" | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'  [{i}/25] {d.get(\"batchNo\",\"ERROR\")}')" 2>/dev/null || echo "  [$i] FAILED"
done

echo ""
echo "Done! Verifying..."
TOTAL=$(curl -s -H "$AUTH" "$BASE/batches?pageSize=1" | python3 -c "import sys,json;print(json.load(sys.stdin)['total'])")
echo "Total batches in system: $TOTAL"
