{{/*
Expand the name of the chart.
*/}}
{{- define "t1d-india.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "t1d-india.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "t1d-india.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "t1d-india.labels" -}}
helm.sh/chart: {{ include "t1d-india.chart" . }}
{{ include "t1d-india.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "t1d-india.selectorLabels" -}}
app.kubernetes.io/name: {{ include "t1d-india.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API selector labels
*/}}
{{- define "t1d-india.api.selectorLabels" -}}
{{- include "t1d-india.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API fullname
*/}}
{{- define "t1d-india.api.fullname" -}}
{{- printf "%s-api" (include "t1d-india.fullname" .) }}
{{- end }}

{{/*
ML selector labels
*/}}
{{- define "t1d-india.ml.selectorLabels" -}}
{{- include "t1d-india.selectorLabels" . }}
app.kubernetes.io/component: ml
{{- end }}

{{/*
ML fullname
*/}}
{{- define "t1d-india.ml.fullname" -}}
{{- printf "%s-ml" (include "t1d-india.fullname" .) }}
{{- end }}

{{/*
Redis fullname
*/}}
{{- define "t1d-india.redis.fullname" -}}
{{- printf "%s-redis" (include "t1d-india.fullname" .) }}
{{- end }}

{{/*
MinIO fullname
*/}}
{{- define "t1d-india.minio.fullname" -}}
{{- printf "%s-minio" (include "t1d-india.fullname" .) }}
{{- end }}