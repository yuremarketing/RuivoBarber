path_main = 'backend/cmd/api/main.go'
with open(path_main, 'r') as f:
    main_content = f.read()

# Revert my bad injection at the end of main.go (from lines 721 onwards)
# I will use regex or string replace to clean it up.
bad_init = '''	sseHub := handlers.NewSSEHub()
	go sseHub.Run()
	sseHandler := handlers.NewSSEHandler(sseHub)
	broadcaster := &HubWrapper{hub: sseHub}'''

new_init = '''	generalSSEHub := handlers.NewSSEHub()
	go generalSSEHub.Run()
	sseHandler := handlers.NewSSEHandler(generalSSEHub)
	broadcaster := &HubWrapper{hub: generalSSEHub}'''

main_content = main_content.replace(bad_init, new_init)

with open(path_main, 'w') as f:
    f.write(main_content)

print("Main fixed")
