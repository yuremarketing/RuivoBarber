package main

import (
	"bufio"
	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()
	app.Get("/stream", func(c *fiber.Ctx) error {
		c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
			w.Write([]byte("test\n"))
			w.Flush()
		})
		return nil
	})
}
