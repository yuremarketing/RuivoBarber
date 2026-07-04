import re

path = 'backend/internal/core/services/pagamento_service.go'
with open(path, 'r') as f:
    content = f.read()

# Fix the PointOfInteraction != nil check
content = content.replace('if response.PointOfInteraction != nil && response.PointOfInteraction.TransactionData != nil {', 'if response.PointOfInteraction.TransactionData.QRCodeBase64 != "" {')

with open(path, 'w') as f:
    f.write(content)

print("pagamento_service fixed")
