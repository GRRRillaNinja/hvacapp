<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0d1f3c">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>HVAC Tech</title>
    <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<header class="app-header">
    <h1>&#128295; HVAC Tech</h1>
    <div class="header-actions">
        <span id="header-date"></span>
    </div>
</header>

<div class="job-list" id="job-list">
    <div class="loading-spinner"><div class="spinner"></div></div>
</div>

<a href="job_form.php" id="fab-add" class="fab" title="Add Job">+</a>

<div class="toast" id="toast"></div>

<script src="assets/js/app.js?v=2"></script>
</body>
</html>
