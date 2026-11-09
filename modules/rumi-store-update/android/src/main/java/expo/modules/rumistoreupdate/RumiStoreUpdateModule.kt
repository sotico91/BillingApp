package expo.modules.rumistoreupdate

import android.app.Activity
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Google Play in-app updates. Rumi asks the store whether a newer build is out
 * (internal test included) and, when the user agrees, runs Play's full-screen
 * update, which installs and restarts the app.
 */
class RumiStoreUpdateModule : Module() {
  private var manager: AppUpdateManager? = null

  private fun updateManager(): AppUpdateManager? {
    manager?.let { return it }
    val context = appContext.reactContext ?: return null
    return AppUpdateManagerFactory.create(context).also { manager = it }
  }

  private fun canStart(info: AppUpdateInfo): Boolean {
    val availability = info.updateAvailability()
    if (availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) return true
    return availability == UpdateAvailability.UPDATE_AVAILABLE &&
      info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
  }

  override fun definition() = ModuleDefinition {
    Name("RumiStoreUpdate")

    AsyncFunction("checkAsync") { promise: Promise ->
      val m = updateManager()
      if (m == null) {
        promise.resolve(mapOf("available" to false, "inProgress" to false))
        return@AsyncFunction
      }
      m.appUpdateInfo
        .addOnSuccessListener { info ->
          promise.resolve(
            mapOf(
              "available" to canStart(info),
              "inProgress" to
                (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS),
              "versionCode" to info.availableVersionCode()
            )
          )
        }
        .addOnFailureListener { e -> promise.reject("ERR_CHECK_UPDATE", e.message, e) }
    }

    AsyncFunction("startAsync") { promise: Promise ->
      val m = updateManager()
      val activity: Activity? = appContext.currentActivity
      if (m == null || activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      m.appUpdateInfo
        .addOnSuccessListener { info ->
          if (!canStart(info)) {
            promise.resolve(false)
            return@addOnSuccessListener
          }
          m.startUpdateFlow(info, activity, AppUpdateOptions.defaultOptions(AppUpdateType.IMMEDIATE))
            .addOnSuccessListener { code -> promise.resolve(code == Activity.RESULT_OK) }
            .addOnFailureListener { e -> promise.reject("ERR_START_UPDATE", e.message, e) }
        }
        .addOnFailureListener { e -> promise.reject("ERR_START_UPDATE", e.message, e) }
    }
  }
}
