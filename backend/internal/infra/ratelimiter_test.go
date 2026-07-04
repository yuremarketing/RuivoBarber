package infra

import (
	"context"
	"testing"
	"time"
)

func TestRateLimiter(t *testing.T) {
	// Reset token bucket for test reproducibility
	mu.Lock()
	tokens = 5.0
	maxTokens = 5.0
	refillRate = 0.0 // disable refill during initial test
	lastRefilled = time.Now()
	mu.Unlock()

	ctx := context.Background()

	// First 5 requests should pass
	for i := 0; i < 5; i++ {
		err := Wait(ctx)
		if err != nil {
			t.Fatalf("Request %d should have passed without error, got: %v", i+1, err)
		}
	}

	// 6th request should fail with ErrRateLimitExceeded
	err := Wait(ctx)
	if err != ErrRateLimitExceeded {
		t.Fatalf("6th request should have failed with ErrRateLimitExceeded, got: %v", err)
	}

	// Allow refill and verify it can accept request again
	mu.Lock()
	refillRate = 100.0 // Fast refill for testing
	lastRefilled = time.Now().Add(-100 * time.Millisecond) // simulates 100ms passing
	mu.Unlock()

	// Wait should now succeed after refill
	err = Wait(ctx)
	if err != nil {
		t.Fatalf("Request after refill should have succeeded, got: %v", err)
	}
}
