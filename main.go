package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"wisdomizer/controllers"
	"wisdomizer/models"
	"wisdomizer/pkg/logs"
	"wisdomizer/pkg/validation"

	"github.com/gin-contrib/multitemplate"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func init() {

	environmentPath := ".env"
	if gin.Mode() == gin.ReleaseMode {
		dir, err := filepath.Abs(filepath.Dir(os.Args[0]))
		if err != nil {
			log.Fatal(err)
		}
		environmentPath = filepath.Join(dir, ".env")
	}

	err := godotenv.Load(environmentPath)
	if err != nil {
		log.Fatalf("Error loading .env file: %s", err)
	}

	models.Init()
	logs.Init()
	validation.Init()
}

func main() {
	defer logs.Logger.Sync()
	gin.SetMode(os.Getenv("GIN_MODE"))

	r := gin.Default()

	r.SetTrustedProxies(nil)
	r.MaxMultipartMemory = 8 << 20 // 8 MiB

	r.Use(logs.GinMiddlewareLogger())

	// Serve static files
	staticPath := "./static"
	if gin.Mode() == gin.ReleaseMode {
		dir, err := filepath.Abs(filepath.Dir(os.Args[0]))
		if err != nil {
			log.Fatal(err)
		}
		staticPath = filepath.Join(dir, "static")
	}

	r.Static("/static", staticPath)

	r.HTMLRender = func() multitemplate.Renderer {
		r := multitemplate.NewRenderer()
		// ----------------------------
		// add here new route template
		// ----------------------------
		r.AddFromFiles("index", "templates/index/index.html")
		r.AddFromFiles("404", "templates/404.html")
		return r
	}()

	// -----------------------
	// add here new controller
	// -----------------------
	controllers.Index(r)
	controllers.Topic(r)

	// not found
	r.NoRoute(func(ctx *gin.Context) {
		ctx.HTML(http.StatusNotFound, "404", gin.H{
			"message": "The requested resource was not found",
		})
	})

	r.Run()
}
