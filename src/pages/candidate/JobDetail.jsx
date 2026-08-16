@@
-        {job.description ? (
-          <JobSection title="Descripción">
-            <p className="whitespace-pre-line">{job.description}</p>
-          </JobSection>
-        ) : null}
-
-        {!shared && requirements.length > 0 ? (
-          <JobSection title="Requisitos">
-            <JobBulletList items={requirements} />
-          </JobSection>
-        ) : null}
+        {job.description ? (
+          <JobSection title="Descripción">
+            <p className="whitespace-pre-line">{job.description}</p>
+          </JobSection>
+        ) : null}
+
+        {requirements.length > 0 ? (
+          <JobSection title="Requisitos">
+            <JobBulletList items={requirements} />
+          </JobSection>
+        ) : null}
@@
-        {!shared && benefits.length > 0 ? (
+        {!shared && benefits.length > 0 ? (
           <JobSection title="Beneficios">
             <JobBulletList items={benefits} />
           </JobSection>
         ) : null}
@@
-        {!shared ? (
+        {!shared ? (
           <SimilarJobAlertToggle
             userId={user?.id}
             job={job}
             canUseCandidateActions={canUseCandidateActions}
             showToast={showToast}
           />
         ) : null}
