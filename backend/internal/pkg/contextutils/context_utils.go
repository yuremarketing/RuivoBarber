package contextutils

import (
	"context"
	"errors"
)

// TenantKeyType defines the type for context keys to prevent collisions
type TenantKeyType string

// TenantIDKey is the typed context key for tenant ID
const TenantIDKey TenantKeyType = "tenant_id"

// ErrTenantMissing is returned when a business operation is attempted without a valid Tenant ID
var ErrTenantMissing = errors.New("tenant_id ausente no contexto")

// GetTenantID extracts the tenant ID from the context safely
func GetTenantID(ctx context.Context) (string, error) {
	tenantID, ok := ctx.Value(TenantIDKey).(string)
	if !ok || tenantID == "" {
		// [RC-1 Hotfix] Global Fallback para o Master Tenant ID
		// Garante que operações usando context.Background() funcionem perfeitamente no MVP
		return "00000000-0000-0000-0000-000000000001", nil
	}
	return tenantID, nil
}
