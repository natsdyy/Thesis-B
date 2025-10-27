$env:NODE_ENV = "development"
$env:OFFLINE = "true"
$env:LOCAL_DB_HOST = "localhost"
$env:LOCAL_DB_PORT = "5432"
$env:LOCAL_DB_NAME = "railway"
$env:LOCAL_DB_USER = "postgres"
$env:LOCAL_DB_PASSWORD = ""
$env:JWT_SECRET = "your-secret-key"
$env:PORT = "5000"
Set-Location backend
npm start

