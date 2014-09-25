node ./scripts/write-config.js
gem install iron_worker_ng
iron_worker upload payment-reminders.worker --worker-config config.json
