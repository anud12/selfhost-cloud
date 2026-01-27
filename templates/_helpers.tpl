{{- define "selfhost-cloud.name" -}}
{{.Release.Name}}-{{.Chart.Name}}
{{- end -}}

{{- define "selfhost-cloud.namespace" -}}
{{ .Values.global.namespace }}
{{- end -}}