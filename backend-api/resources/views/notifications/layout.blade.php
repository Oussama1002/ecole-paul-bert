<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>{{ $subjectLine ?? 'École Paul Bert' }}</title>
    <style>
        /* Client-safe, inline-friendly styles. */
        body {
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            -webkit-text-size-adjust: 100%;
        }
        .wrapper { width: 100%; background-color: #f3f4f6; padding: 24px 0; }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .header {
            background-color: #1d4ed8;
            padding: 24px;
            text-align: center;
        }
        .header .logo {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            background-color: #ffffff;
            display: inline-block;
            line-height: 56px;
            font-size: 28px;
            vertical-align: middle;
        }
        .header .brand {
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
            margin: 12px 0 0;
        }
        .body { padding: 28px 28px 8px; }
        .body h1 { font-size: 20px; margin: 0 0 16px; color: #111827; }
        .body p { font-size: 15px; line-height: 1.6; margin: 0 0 14px; }
        .panel {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px 18px;
            margin: 0 0 18px;
        }
        .panel table { width: 100%; border-collapse: collapse; }
        .panel td { padding: 4px 0; font-size: 14px; vertical-align: top; }
        .panel td.label { color: #6b7280; width: 45%; }
        .panel td.value { color: #111827; font-weight: 600; text-align: right; }
        .footer {
            padding: 20px 28px 28px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            line-height: 1.5;
        }
        .footer strong { color: #6b7280; }
        @media only screen and (max-width: 620px) {
            .container { border-radius: 0; }
            .body { padding: 20px 18px 4px; }
            .footer { padding: 16px 18px 24px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <span class="logo" aria-hidden="true">🎓</span>
                <p class="brand">École Paul Bert</p>
            </div>
            <div class="body">
                @yield('content')
            </div>
            <div class="footer">
                <p>
                    <strong>École Paul Bert</strong><br>
                    Cet e-mail vous est envoyé automatiquement, merci de ne pas y répondre.<br>
                    Pour toute question, veuillez contacter le secrétariat de l'école.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
